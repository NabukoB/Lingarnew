"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { chartTime } from "@/lib/format";
import { nearestIndex, niceTop, timeArea, timeLine, xOf, yOf, type Scale } from "@/lib/timechart";
import { cn } from "@/lib/utils";

export type TimeSeries = { key: string; label: string; color: string; values: number[] };

type Props = {
  title: string;
  /** ISO timestamps, ascending; one per value. */
  times: string[];
  series: TimeSeries[];
  /** Shown time window, so missing data reads as a gap. */
  spanMs: number;
  stepMs: number;
  format: (v: number) => string;
  /** Fixed axis top (e.g. 100 for %); otherwise a clean step above the data. */
  max?: number;
  /** Day views label hours; longer views label dates. */
  dayView: boolean;
  className?: string;
};

const H = 168;
const PAD = { top: 10, right: 12, bottom: 24 };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Line chart over time: 2px lines, a 10% wash under a single series, a
 * crosshair + tooltip listing every series at the hovered time, arrow-key
 * navigation, and a screen-reader table with the same numbers.
 */
export function TimeChart({ title, times, series, spanMs, stepMs, format, max, dayView, className }: Props) {
  const [wrap, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  // Announce tooltip changes only when the keyboard drives them.
  const [kbd, setKbd] = useState(false);
  const gradient = useId();
  const ts = useMemo(() => times.map((t) => Date.parse(t)), [times]);
  const end = ts.length ? Math.max(ts[ts.length - 1]!, Date.now() - stepMs) : Date.now();
  const top = max ?? niceTop(Math.max(0, ...series.flatMap((s) => s.values)) * 1.08);
  const ticks = [0, top / 2, top];
  // Room for the widest y label (10.5px semibold ≈ 6.4px per character).
  const left = Math.max(30, Math.ceil(Math.max(...ticks.map((v) => format(v).length)) * 6.4) + 14);
  const scale: Scale = { t0: end - spanMs, t1: end, x0: left, x1: Math.max(left + 1, width - PAD.right), yTop: PAD.top, yBase: H - PAD.bottom, max: top };
  const gap = stepMs * 2.5;
  const single = series.length === 1;
  const last = ts.length - 1;

  const pick = useCallback(
    (clientX: number, el: Element) => {
      const r = el.getBoundingClientRect();
      const t = scale.t0 + ((clientX - r.left - scale.x0) / (scale.x1 - scale.x0)) * (scale.t1 - scale.t0);
      setHover(nearestIndex(ts, t));
    },
    [ts, scale.t0, scale.t1, scale.x0, scale.x1],
  );

  const onKey = (e: React.KeyboardEvent) => {
    if (!ts.length) return;
    const cur = hover ?? last;
    const next = e.key === "ArrowLeft" ? cur - 1 : e.key === "ArrowRight" ? cur + 1 : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (next === null) return;
    e.preventDefault();
    setHover(Math.max(0, Math.min(last, next)));
  };

  const xLabels = [scale.t0, scale.t0 + spanMs / 2, scale.t1].map((t) => chartTime(new Date(t).toISOString(), !dayView));
  const hx = hover !== null && hover >= 0 ? xOf(ts[hover]!, scale) : null;
  const tipLeft = hx !== null ? Math.min(Math.max(hx, 90), width - 90) : 0;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h3 className="text-sm font-extrabold">{title}</h3>
        {!single && (
          <ul className="flex flex-wrap gap-3" aria-label={`${title} legend`}>
            {series.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <span aria-hidden className="h-[2px] w-3.5 rounded-full" style={{ background: s.color }} />
                {s.label}
                {last >= 0 && <span className="tabular font-bold text-foreground">{format(s.values[last]!)}</span>}
              </li>
            ))}
          </ul>
        )}
        {single && last >= 0 && <span className="tabular ml-auto text-sm font-bold">{format(series[0]!.values[last]!)}</span>}
      </div>
      <div ref={wrap} className="relative">
        {ts.length === 0 ? (
          <div className="flex h-[168px] items-center justify-center rounded-2xl bg-muted/50 text-sm font-semibold text-muted-foreground">No data yet</div>
        ) : (
          width > 0 && (
            <svg
              width={width}
              height={H}
              role="img"
              aria-label={`${title} chart. Use arrow keys to read values.`}
              tabIndex={0}
              className="block touch-pan-y rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onPointerMove={(e) => {
                setKbd(false);
                pick(e.clientX, e.currentTarget);
              }}
              onPointerDown={(e) => pick(e.clientX, e.currentTarget)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => {
                setKbd(true);
                setHover(last);
              }}
              onBlur={() => setHover(null)}
              onKeyDown={onKey}
            >
              {single && (
                <defs>
                  <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={series[0]!.color} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={series[0]!.color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
              )}
              {ticks.map((v, i) => (
                <g key={i}>
                  <line x1={scale.x0} x2={scale.x1} y1={yOf(v, scale)} y2={yOf(v, scale)} stroke={i === 0 ? "#e2e8f0" : "#f1f3f6"} strokeWidth={1} />
                  <text x={scale.x0 - 8} y={yOf(v, scale)} dy="0.32em" textAnchor="end" className="tabular fill-muted-foreground text-[10.5px] font-semibold">
                    {format(v)}
                  </text>
                </g>
              ))}
              {xLabels.map((l, i) => (
                <text
                  key={i}
                  x={i === 0 ? scale.x0 : i === 1 ? (scale.x0 + scale.x1) / 2 : scale.x1}
                  y={H - 6}
                  textAnchor={i === 0 ? "start" : i === 1 ? "middle" : "end"}
                  className="tabular fill-muted-foreground text-[10.5px] font-semibold"
                >
                  {l}
                </text>
              ))}
              {single && <path d={timeArea(ts, series[0]!.values, scale, gap)} fill={`url(#${gradient})`} />}
              {series.map((s) => (
                <path key={s.key} d={timeLine(ts, s.values, scale, gap)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              ))}
              {hx === null &&
                series.map((s) => (
                  <circle key={s.key} cx={xOf(ts[last]!, scale)} cy={yOf(s.values[last]!, scale)} r={4} fill={s.color} stroke="#fff" strokeWidth={2} />
                ))}
              {hx !== null && hover !== null && (
                <g pointerEvents="none">
                  <line x1={hx} x2={hx} y1={scale.yTop} y2={scale.yBase} stroke="#94a3b8" strokeWidth={1} />
                  {series.map((s) => (
                    <circle key={s.key} cx={hx} cy={yOf(s.values[hover]!, scale)} r={4} fill={s.color} stroke="#fff" strokeWidth={2} />
                  ))}
                </g>
              )}
            </svg>
          )
        )}
        {hx !== null && hover !== null && (
          <div
            aria-live={kbd ? "polite" : "off"}
            className="pointer-events-none absolute top-0 z-10 min-w-[150px] -translate-x-1/2 -translate-y-2 rounded-2xl bg-white px-3 py-2 shadow-float"
            style={{ left: tipLeft }}
          >
            <div className="text-[11px] font-semibold text-muted-foreground">{chartTime(times[hover]!, !dayView, true)}</div>
            {series.map((s) => (
              <div key={s.key} className="flex items-center gap-2 py-0.5">
                <span aria-hidden className="h-[2px] w-3 rounded-full" style={{ background: s.color }} />
                <span className="tabular text-sm font-extrabold">{format(s.values[hover]!)}</span>
                <span className="text-xs font-semibold text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="sr-only">
      <table>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((t, i) => (
            <tr key={t}>
              <th scope="row">{chartTime(t, !dayView, true)}</th>
              {series.map((s) => (
                <td key={s.key}>{format(s.values[i]!)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
