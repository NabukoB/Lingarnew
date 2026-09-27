import { Download } from "lucide-react";
import { PageHeader } from "@/components/bits";
import { MoneyCard } from "@/components/MoneyCard";
import { Stagger, StaggerItem } from "@/components/motion";
import { PaymentsList } from "@/components/PaymentsList";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPayments, getRevenue } from "@/lib/api";
import { formatKshShort } from "@/lib/format";

export const metadata = { title: "Money · Mtandao" };
export const dynamic = "force-dynamic";

export default async function MoneyPage() {
  const [revenue, payments] = await Promise.all([getRevenue(), getPayments()]);
  const csv =
    "data:text/csv;charset=utf-8," +
    encodeURIComponent(["Time,Who,Detail,Amount (KES)", ...payments.map((p) => [p.time, p.who, p.detail, p.amount].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n"));
  return (
    <>
      <PageHeader
        title="Money"
        actions={
          <Button asChild variant="secondary" size="icon" aria-label="Export payments">
            <a href={csv} download="payments.csv">
              <Download aria-hidden size={18} strokeWidth={2.2} />
            </a>
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-5">
        <MoneyCard series={revenue.series} split={revenue.split} showHeading={false} />
        <div className="flex flex-col gap-4">
          <Card aria-label="Top packages" className="px-5 py-1.5">
            <Stagger>
              {revenue.top.map((p, i) => (
                <StaggerItem key={p.name} className={`flex items-center gap-3 py-3 ${i ? "border-t border-line" : ""}`}>
                  <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[9px] bg-accent text-xs font-extrabold text-primary">{i + 1}</span>
                  <span className="flex-grow text-sm font-bold">{p.name}</span>
                  <span className="text-xs font-semibold text-muted-foreground">{p.sold.toLocaleString("en-KE")}</span>
                  <span className="tabular w-20 text-right text-sm font-extrabold">{formatKshShort(p.revenue)}</span>
                </StaggerItem>
              ))}
            </Stagger>
            {revenue.top.length === 0 && <p className="py-6 text-center text-sm font-semibold text-muted-foreground">No sales yet</p>}
          </Card>
          <PaymentsList payments={payments} columns={1} />
        </div>
      </div>
    </>
  );
}
