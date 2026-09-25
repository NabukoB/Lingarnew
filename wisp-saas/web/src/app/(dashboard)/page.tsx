import { AlertRow } from "@/components/AlertRow";
import { AssistantBar } from "@/components/AssistantBar";
import { HeroToday } from "@/components/HeroToday";
import { MoneyCard } from "@/components/MoneyCard";
import { NetworkCard } from "@/components/NetworkCard";
import { PaymentsList } from "@/components/PaymentsList";
import { QuickActions } from "@/components/QuickActions";
import { StatTiles } from "@/components/StatTiles";
import { TopBar } from "@/components/TopBar";
import { getOverview, getPayments, getRevenue, getRouters, getTenant } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [tenant, overview, revenue, routers, payments] = await Promise.all([
    getTenant(),
    getOverview(),
    getRevenue(),
    getRouters(),
    getPayments(),
  ]);

  return (
    <>
      <TopBar tenant={tenant} />

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
        <HeroToday amount={overview.mpesaToday} previous={overview.mpesaTodayPrev} sparkline={overview.sparkline} />
        <StatTiles overview={overview} />
        <div className="flex flex-col gap-3">
          <AlertRow routers={routers} />
          <QuickActions />
        </div>
      </div>

      <div className="hidden gap-5 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <MoneyCard series={revenue.series} split={revenue.split} />
        <NetworkCard routers={routers} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-5">
        <PaymentsList payments={payments} />
        <div className="hidden lg:block">
          <AssistantBar />
        </div>
      </div>
    </>
  );
}
