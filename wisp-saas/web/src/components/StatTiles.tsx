import { CheckCheck, Home, ShoppingCart, Wifi } from "lucide-react";
import type { Overview } from "@/lib/types";
import { percentChange } from "@/lib/format";
import { DeltaChip, IconBox, type Tone } from "./ui";

export function StatTiles({ overview }: { overview: Overview }) {
  const tiles: { label: string; value: string; pct: number; icon: typeof Wifi; tone: Tone }[] = [
    { label: "Online", value: String(overview.online.value), pct: percentChange(overview.online.value, overview.online.prev), icon: Wifi, tone: "green" },
    { label: "PPPoE", value: String(overview.pppoe.value), pct: percentChange(overview.pppoe.value, overview.pppoe.prev), icon: Home, tone: "blue" },
    { label: "Hotspot", value: String(overview.hotspotSales.value), pct: percentChange(overview.hotspotSales.value, overview.hotspotSales.prev), icon: ShoppingCart, tone: "orange" },
    { label: "Paid on time", value: overview.onTimeRate.value + "%", pct: overview.onTimeRate.value - overview.onTimeRate.prev, icon: CheckCheck, tone: "violet" },
  ];
  return (
    <section aria-label="Key numbers" className="grid grid-cols-2 gap-3">
      {tiles.map((t) => (
        <div key={t.label} className="flex flex-col justify-between gap-3 rounded-tile bg-white p-4 shadow-card">
          <IconBox icon={t.icon} tone={t.tone} />
          <div className="flex items-end justify-between gap-1.5">
            <div className="flex flex-col">
              <span className="tabular text-[22px] font-extrabold tracking-tight">{t.value}</span>
              <span className="text-xs font-semibold text-slate-500">{t.label}</span>
            </div>
            <DeltaChip pct={t.pct} />
          </div>
        </div>
      ))}
    </section>
  );
}
