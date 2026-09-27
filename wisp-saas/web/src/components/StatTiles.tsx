"use client";

import { CheckCheck, Home, ShoppingCart, Wifi } from "lucide-react";
import Link from "next/link";
import { DeltaChip, IconBox, type Tone } from "@/components/bits";
import { CountUp, m, Stagger, StaggerItem } from "@/components/motion";
import { percentChange } from "@/lib/format";
import type { Overview } from "@/lib/types";

export function StatTiles({ overview }: { overview: Overview }) {
  const tiles: { label: string; value: number; suffix?: string; pct: number; icon: typeof Wifi; tone: Tone; href: string }[] = [
    { label: "Online", value: overview.online.value, pct: percentChange(overview.online.value, overview.online.prev), icon: Wifi, tone: "green", href: "/network" },
    { label: "PPPoE", value: overview.pppoe.value, pct: percentChange(overview.pppoe.value, overview.pppoe.prev), icon: Home, tone: "blue", href: "/customers" },
    { label: "Hotspot", value: overview.hotspotSales.value, pct: percentChange(overview.hotspotSales.value, overview.hotspotSales.prev), icon: ShoppingCart, tone: "orange", href: "/money" },
    { label: "On time", value: overview.onTimeRate.value, suffix: "%", pct: overview.onTimeRate.value - overview.onTimeRate.prev, icon: CheckCheck, tone: "violet", href: "/customers" },
  ];
  return (
    <Stagger as="section" className="grid grid-cols-2 gap-3">
      {tiles.map((t) => (
        <StaggerItem key={t.label}>
          <Link href={t.href} className="block h-full" aria-label={`${t.label}: ${t.value}${t.suffix ?? ""}`}>
            <m.div whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }} className="flex h-full flex-col justify-between gap-3 rounded-tile bg-card p-4 shadow-card transition-shadow hover:shadow-float">
              <IconBox icon={t.icon} tone={t.tone} />
              <div className="flex items-end justify-between gap-1.5">
                <div className="flex flex-col">
                  <CountUp value={t.value} format={(n) => Math.round(n).toLocaleString("en-KE") + (t.suffix ?? "")} className="text-[22px] font-extrabold tracking-tight" />
                  <span className="text-xs font-semibold text-muted-foreground">{t.label}</span>
                </div>
                <DeltaChip pct={t.pct} />
              </div>
            </m.div>
          </Link>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
