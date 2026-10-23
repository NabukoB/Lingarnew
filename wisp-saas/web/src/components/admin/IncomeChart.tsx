"use client";

import { TimeChart } from "@/components/charts/TimeChart";
import { formatKshShort } from "@/lib/format";

// Same validated blue/green pair as the router charts.
export function IncomeChart({ income }: { income: { day: string; subscriptions_kes: number; sms_credits_kes: number }[] }) {
  const times = income.map((d) => `${d.day}T09:00:00Z`); // noon in Nairobi
  return (
    <TimeChart
      title="Daily income"
      times={times}
      spanMs={30 * 864e5}
      stepMs={864e5}
      dayView={false}
      format={(v) => formatKshShort(v).replace("KSh ", "")}
      series={[
        { key: "subs", label: "Subscriptions", color: "#2563eb", values: income.map((d) => d.subscriptions_kes) },
        { key: "sms", label: "SMS credits", color: "#16a34a", values: income.map((d) => d.sms_credits_kes) },
      ]}
    />
  );
}
