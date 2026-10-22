"use client";

import { useState, useTransition } from "react";
import { TimeChart } from "@/components/charts/TimeChart";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "@/components/ui/sonner";
import { loadRouterMetrics } from "@/lib/actions";
import { formatBps } from "@/lib/format";
import type { MetricRange, MetricSeries } from "@/lib/types";
import { cn } from "@/lib/utils";

const ranges: { value: MetricRange; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];
const spanMs: Record<MetricRange, number> = { "24h": 864e5, "7d": 7 * 864e5, "30d": 30 * 864e5 };

// Validated categorical pairs (blue/green, blue/orange) from the §14 palette.
const BLUE = "#2563eb";
const GREEN = "#16a34a";
const ORANGE = "#ea580c";

const pct = (v: number) => `${Math.round(v)}%`;
const count = (v: number) => String(Math.round(v));

export function RouterMetrics({ routerId, initial }: { routerId: string; initial: MetricSeries }) {
  const [data, setData] = useState(initial);
  const [range, setRange] = useState<MetricRange>(initial.range);
  const [pending, start] = useTransition();

  const choose = (r: MetricRange) => {
    setRange(r);
    start(async () => {
      const res = await loadRouterMetrics(routerId, r);
      if (res.ok) setData(res.data);
      else {
        toast.error(res.error);
        setRange(data.range);
      }
    });
  };

  const times = data.points.map((p) => p.at);
  const common = { times, spanMs: spanMs[data.range], stepMs: data.stepSec * 1000, dayView: data.range === "24h" };

  return (
    <section aria-label="Router health" className="flex flex-col gap-3">
      <Segmented id="metric-range" label="Range" tone="white" items={ranges} value={range} onValueChange={(v) => choose(v as MetricRange)} className="self-start" />
      <div className={cn("grid gap-4 transition-opacity lg:grid-cols-3 lg:gap-5", pending && "opacity-50")} aria-busy={pending}>
        <Card className="p-5">
          <TimeChart {...common} title="CPU" max={100} format={pct} series={[{ key: "cpu", label: "CPU", color: BLUE, values: data.points.map((p) => p.cpu) }]} />
        </Card>
        <Card className="p-5">
          <TimeChart
            {...common}
            title="Users"
            format={count}
            series={[
              { key: "pppoe", label: "PPPoE", color: BLUE, values: data.points.map((p) => p.pppoe) },
              { key: "hotspot", label: "Hotspot", color: GREEN, values: data.points.map((p) => p.hotspot) },
            ]}
          />
        </Card>
        <Card className="p-5">
          <TimeChart
            {...common}
            title="Uplink"
            format={formatBps}
            series={[
              { key: "rx", label: "Down", color: BLUE, values: data.points.map((p) => p.rxBps) },
              { key: "tx", label: "Up", color: ORANGE, values: data.points.map((p) => p.txBps) },
            ]}
          />
        </Card>
      </div>
    </section>
  );
}
