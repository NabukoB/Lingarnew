"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { columnsFor, layout, linkPath, type PlacedRouter } from "@/lib/topology";
import type { MapSite, RouterStatus } from "@/lib/types";

// Status colours are the reserved good / attention / failed set (§14), always with a text label.
const STATUS: Record<RouterStatus, { color: string; label: string }> = {
  online: { color: "#16a34a", label: "Online" },
  slow: { color: "#d97706", label: "Slow" },
  offline: { color: "#dc2626", label: "Offline" },
  pending: { color: "#94a3b8", label: "Not connected" },
};

function clip(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function RouterCard({ p, active, onHover, onOpen }: { p: PlacedRouter; active: boolean; onHover: (id: string | null) => void; onOpen: (id: string) => void }) {
  const r = p.router;
  const st = STATUS[r.status];
  const busy = (r.cpu ?? 0) >= 90;
  const sub = r.status === "offline" ? "Offline" : [r.users !== null ? `${r.users} users` : null, r.cpu !== null ? `CPU ${r.cpu}%` : null].filter(Boolean).join(" · ") || st.label;
  return (
    <g
      role="link"
      tabIndex={0}
      aria-label={`${r.name}, ${st.label}${r.users !== null ? `, ${r.users} users` : ""}${busy ? ", high CPU" : ""}`}
      className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-[#2563eb] [&:focus-visible>rect]:stroke-2"
      onPointerEnter={() => onHover(r.id)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => onHover(r.id)}
      onBlur={() => onHover(null)}
      onClick={() => onOpen(r.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(r.id);
        }
      }}
    >
      <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={18} fill="#fff" stroke={active ? "#bfdbfe" : "transparent"} strokeWidth={2} style={{ filter: "drop-shadow(0 4px 14px rgba(15,23,42,0.08))" }} />
      <circle cx={p.x + 22} cy={p.y + 22} r={5} fill={st.color} />
      <text x={p.x + 36} y={p.y + 26} className="fill-foreground text-[13px] font-extrabold">
        {clip(r.name, 22)}
      </text>
      <text x={p.x + 36} y={p.y + 44} className={busy ? "fill-amber-700 text-[11px] font-bold" : "fill-muted-foreground text-[11px] font-semibold"}>
        {clip(sub, 30)}
      </text>
    </g>
  );
}

export function NetworkMap({ sites }: { sites: MapSite[] }) {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hot, setHot] = useState<string | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const l = useMemo(() => layout(sites, columnsFor(width || 1200)), [sites, width]);
  const open = (id: string) => router.push(`/routers/${id}`);
  const lit = (ids: string[]) => hot !== null && ids.includes(hot);

  return (
    <div className="flex flex-col gap-3">
      <div ref={wrap} className="overflow-x-auto rounded-card bg-white/60 shadow-card">
        {width > 0 && (
          <svg width={Math.max(l.width, width)} height={l.height} role="group" aria-label="Network map" className="block">
            {l.links.map((k) => (
              <path
                key={`l-${k.a.router.id}-${k.b.router.id}`}
                d={linkPath(k.a, k.b)}
                fill="none"
                stroke="#2563eb"
                strokeOpacity={lit([k.a.router.id, k.b.router.id]) ? 1 : 0.45}
                strokeWidth={2}
                strokeLinecap="round"
              />
            ))}
            {l.sites.map((s) => (
              <text key={`${s.name}-${s.x}-${s.y}`} x={s.x + 4} y={s.y + 14} className="fill-muted-foreground text-[11px] font-bold uppercase tracking-[0.08em]">
                {clip(s.name, 28)}
              </text>
            ))}
            {l.devices.map((d) => {
              const owner = l.routers.find((p) => p.router.id === d.owner)!;
              return (
                <g key={`${d.owner}-${d.device.mac}-${d.device.interface}`}>
                  <path d={`M${owner.x + 14},${owner.y + owner.h} V${d.y} H${d.x - 6}`} fill="none" stroke="#cbd5e1" strokeWidth={1} />
                  <circle cx={d.x} cy={d.y} r={4} fill="#fff" stroke="#94a3b8" strokeWidth={2} />
                  <text x={d.x + 10} y={d.y + 4} className="fill-foreground text-[11.5px] font-bold">
                    {clip(d.device.identity || d.device.mac, 18)}
                    <tspan className="fill-muted-foreground font-semibold">{d.device.platform ? ` · ${clip(d.device.platform, 10)}` : ""}</tspan>
                    <title>{[d.device.identity || d.device.mac, d.device.board, d.device.address, d.device.interface].filter(Boolean).join(" · ")}</title>
                  </text>
                </g>
              );
            })}
            {l.routers.map((p) => (
              <RouterCard key={p.router.id} p={p} active={hot === p.router.id} onHover={setHot} onOpen={open} />
            ))}
          </svg>
        )}
        {l.routers.length === 0 && <p className="px-6 pb-6 text-sm font-semibold text-muted-foreground">No routers yet</p>}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 px-1 text-xs font-semibold text-muted-foreground" aria-label="Map legend">
        {(["online", "slow", "offline"] as const).map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS[k].color }} />
            {STATUS[k].label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-[2px] w-4 rounded-full bg-primary" />
          Router link
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full border-2 border-slate-400 bg-white" />
          Other device
        </li>
      </ul>
    </div>
  );
}
