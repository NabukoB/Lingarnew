import Link from "next/link";
import type { Badges } from "@/components/shell/nav";
import { BottomTabs } from "@/components/shell/BottomTabs";
import { CommandProvider } from "@/components/shell/CommandPalette";
import { Sidebar } from "@/components/shell/Sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { alertsFrom } from "@/lib/alerts";
import { getOverview, getTenant } from "@/lib/api";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [tenant, overview] = await Promise.all([getTenant(), getOverview()]);
  const alerts = alertsFrom(overview, tenant);
  const badges: Badges = {};
  for (const a of alerts) {
    const nav = {
      routers: "Routers",
      unmatched: "Money",
      renewals: "Customers",
      sms: "SMS",
    }[a.key];
    const n = a.text.match(/^\d+/)?.[0];
    if (nav) badges[nav] = { text: n ?? "!", tone: a.tone };
  }
  return (
    <CommandProvider>
      <TooltipProvider delayDuration={300}>
        <div className="mx-auto flex min-h-screen max-w-[1440px]">
          <Sidebar
            business={tenant.name}
            initials={tenant.initials}
            trialDaysLeft={tenant.trialDaysLeft}
            badges={badges}
            lapsed={tenant.subscriptionStatus === "lapsed"}
          />
          <main className="flex min-w-0 flex-grow flex-col gap-4 px-4 pb-28 pt-4 lg:gap-5 lg:py-6 lg:pl-2 lg:pr-8">
            {tenant.subscriptionStatus === "lapsed" && (
              <Link
                href="/settings/billing"
                className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100"
              >
                <span aria-hidden className="h-2 w-2 rounded-full bg-red-500" />
                Subscription expired, top up in Billing
              </Link>
            )}
            {children}
          </main>
          <BottomTabs />
        </div>
      </TooltipProvider>
    </CommandProvider>
  );
}
