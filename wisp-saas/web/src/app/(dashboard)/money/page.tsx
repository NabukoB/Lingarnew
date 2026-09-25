import { Download } from "lucide-react";
import { MoneyCard } from "@/components/MoneyCard";
import { PaymentsList } from "@/components/PaymentsList";
import { getPayments, getRevenue } from "@/lib/api";
import { formatKshShort } from "@/lib/format";

export const metadata = { title: "Money · Mtandao" };

export default async function MoneyPage() {
  const [revenue, payments] = await Promise.all([getRevenue(), getPayments()]);
  return (
    <>
      <header className="flex h-[52px] items-center">
        <h1 className="text-2xl font-extrabold tracking-tight">Money</h1>
        <button type="button" aria-label="Export" className="ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-soft">
          <Download aria-hidden size={18} strokeWidth={2.2} />
        </button>
      </header>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-5">
        <MoneyCard series={revenue.series} split={revenue.split} showHeading={false} />
        <div className="flex flex-col gap-4">
          <section aria-label="Top packages" className="rounded-card bg-white px-5 py-1.5 shadow-card">
            {revenue.top.map((p, i) => (
              <div key={p.name} className={`flex items-center gap-3 py-3 ${i ? "border-t border-line" : ""}`}>
                <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[9px] bg-blue-50 text-xs font-extrabold text-blue-600">{i + 1}</span>
                <span className="flex-grow text-sm font-bold">{p.name}</span>
                <span className="text-xs font-semibold text-slate-500">{p.sold.toLocaleString("en-KE")}</span>
                <span className="tabular w-20 text-right text-sm font-extrabold">{formatKshShort(p.revenue)}</span>
              </div>
            ))}
          </section>
          <PaymentsList payments={payments} columns={1} />
        </div>
      </div>
    </>
  );
}
