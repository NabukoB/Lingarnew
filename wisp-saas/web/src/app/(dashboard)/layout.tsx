import { BottomTabs } from "@/components/BottomTabs";
import type { Badges } from "@/components/nav";
import { Sidebar } from "@/components/Sidebar";
import { getOverview, getTenant } from "@/lib/api";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [tenant, overview] = await Promise.all([getTenant(), getOverview()]);
  const badges: Badges = {};
  const offline = overview.routers?.offline ?? 0;
  if (offline > 0) badges.Routers = { text: String(offline), tone: "red" };
  if (overview.unmatched) badges.Money = { text: String(overview.unmatched), tone: "amber" };
  if (overview.renewalsDue) badges.Customers = { text: String(overview.renewalsDue), tone: "amber" };
  return (
    <div className="mx-auto flex min-h-screen max-w-[1440px]">
      <Sidebar trialDaysLeft={tenant.trialDaysLeft} badges={badges} lapsed={tenant.subscriptionStatus === "lapsed"} />
      <main className="flex min-w-0 flex-grow flex-col gap-4 px-4 pb-28 pt-4 lg:gap-5 lg:py-6 lg:pl-2 lg:pr-8">
        {tenant.subscriptionStatus === "lapsed" && (
          <a href="/settings/billing" className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            <span aria-hidden className="h-2 w-2 rounded-full bg-red-500" />
            Subscription expired, top up in Billing
          </a>
        )}
        {tenant.smsCredits === 0 && tenant.subscriptionStatus !== "lapsed" && (
          <a href="/settings/sms" className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            <span aria-hidden className="h-2 w-2 rounded-full bg-amber-500" />
            No SMS credits
          </a>
        )}
        {children}
      </main>
      <BottomTabs />
    </div>
  );
}
