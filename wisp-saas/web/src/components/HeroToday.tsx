import { formatKsh, percentChange } from "@/lib/format";
import { linePath, niceMax } from "@/lib/chart";
import { DeltaChip } from "./ui";

export function HeroToday({ amount, previous, sparkline }: { amount: number; previous: number; sparkline: number[] }) {
  const box = { x0: 0, x1: 320, y0: 48, height: 42, max: niceMax(sparkline) };
  return (
    <section
      aria-label="M-Pesa today"
      className="flex min-h-[176px] flex-col rounded-card bg-gradient-to-br from-blue-900 via-blue-600 to-blue-500 px-6 py-5 text-white shadow-brand"
    >
      <div className="flex items-center">
        <span className="text-sm font-semibold text-blue-100">M-Pesa today</span>
        <span className="ml-auto">
          <DeltaChip pct={percentChange(amount, previous)} decimals={1} onDark />
        </span>
      </div>
      <span className="tabular mt-1.5 text-[34px] font-extrabold tracking-tight lg:text-[40px]">{formatKsh(amount)}</span>
      <svg viewBox="0 0 320 54" aria-hidden className="mt-auto h-12 w-full">
        <path d={linePath(sparkline, box)} fill="none" stroke="#fff" strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
      </svg>
    </section>
  );
}
