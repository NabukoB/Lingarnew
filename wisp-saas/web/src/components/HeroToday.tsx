"use client";

import { DeltaChip } from "@/components/bits";
import { CountUp, m } from "@/components/motion";
import { linePath, niceMax } from "@/lib/chart";
import { formatKsh, percentChange } from "@/lib/format";

export function HeroToday({ amount, previous, sparkline }: { amount: number; previous: number; sparkline: number[] }) {
  const box = { x0: 0, x1: 320, y0: 48, height: 42, max: niceMax(sparkline) };
  return (
    <m.section
      aria-label="M-Pesa today"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex min-h-[176px] flex-col overflow-hidden rounded-card bg-gradient-to-br from-blue-900 via-blue-600 to-blue-500 px-6 py-5 text-white shadow-brand"
    >
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-center">
        <span className="text-sm font-semibold text-blue-100">M-Pesa today</span>
        <span className="ml-auto">
          <DeltaChip pct={percentChange(amount, previous)} decimals={1} onDark />
        </span>
      </div>
      <CountUp value={amount} format={formatKsh} className="relative mt-1.5 text-[34px] font-extrabold tracking-tight lg:text-[40px]" />
      <svg viewBox="0 0 320 54" aria-hidden className="relative mt-auto h-12 w-full">
        <m.path
          d={linePath(sparkline, box)}
          fill="none"
          stroke="#fff"
          strokeWidth={2.6}
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.9 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        />
      </svg>
    </m.section>
  );
}
