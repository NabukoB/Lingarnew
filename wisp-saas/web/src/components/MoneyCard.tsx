"use client";

import clsx from "clsx";
import { useId, useState } from "react";
import type { Period, RevenueSeries, RevenueSplit } from "@/lib/types";
import { areaPath, linePath, niceMax, pointAt } from "@/lib/chart";
import { formatKshShort, percentChange } from "@/lib/format";
import { DeltaChip } from "./ui";

const periods: { id: Period; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function MoneyCard({
  series,
  split,
  showHeading = true,
}: {
  series: Record<Period, RevenueSeries>;
  split: RevenueSplit[];
  showHeading?: boolean;
}) {
  const [period, setPeriod] = useState<Period>("month");
  const gradientId = useId();
  const s = series[period];
  const total = sum(s.current);
  const prevTotal = sum(s.previous);
  const max = niceMax([...s.current, ...s.previous]);
  const box = { x0: 6, x1: 694, y0: 168, height: 156, max };
  const end = pointAt(s.current, s.current.length - 1, box);

  return (
    <section aria-label="Money" className="flex flex-col gap-2.5 rounded-card bg-white px-5 py-5 shadow-card lg:px-6">
      <div className="flex items-center gap-3">
        {showHeading && <h2 className="text-base font-extrabold">Money</h2>}
        <div role="group" aria-label="Period" className="ml-auto flex rounded-xl bg-slate-100 p-[3px]">
          {periods.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={p.id === period}
              onClick={() => setPeriod(p.id)}
              className={clsx(
                "h-8 rounded-[9px] px-3.5 text-xs",
                p.id === period ? "bg-white font-extrabold text-slate-900 shadow-sm" : "font-bold text-slate-500",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="tabular text-[30px] font-extrabold tracking-tight lg:text-[32px]">{formatKshShort(total)}</span>
        <DeltaChip pct={percentChange(total, prevTotal)} decimals={1} />
      </div>
      <svg viewBox="0 0 700 190" role="img" aria-label={`M-Pesa revenue this ${period}; dashed line is the previous ${period}.`} className="h-[150px] w-full lg:h-[190px]" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
        </defs>
        <g stroke="#f1f3f6">
          <line x1="0" y1="12" x2="700" y2="12" />
          <line x1="0" y1="64" x2="700" y2="64" />
          <line x1="0" y1="116" x2="700" y2="116" />
        </g>
        <line x1="0" y1="168" x2="700" y2="168" stroke="#e2e8f0" />
        <path d={areaPath(s.current, box)} fill={`url(#${gradientId})`} />
        <path d={linePath(s.previous, box)} fill="none" stroke="#cbd5e1" strokeWidth={1.8} strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
        <path d={linePath(s.current, box)} fill="none" stroke="#2563eb" strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <circle cx={end.x} cy={end.y} r={6} fill="#2563eb" stroke="#fff" strokeWidth={2.5} />
      </svg>
      <div className="flex justify-between text-[11px] text-slate-400">
        {s.labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {split.map((x) => (
          <div key={x.label} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: x.color }} />
              <span className="text-[13px] font-bold text-slate-700">{x.label}</span>
              <span className="tabular ml-auto text-[13px] font-extrabold">{formatKshShort(total * x.share)}</span>
            </div>
            <div className="h-2 rounded bg-slate-100">
              <div className="h-2 rounded" style={{ width: `${x.share * 100}%`, background: x.color }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
