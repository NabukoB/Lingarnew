import { BottomTabs } from "@/components/BottomTabs";
import { Sidebar } from "@/components/Sidebar";
import { getTenant } from "@/lib/api";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenant();
  return (
    <div className="mx-auto flex min-h-screen max-w-[1440px]">
      <Sidebar trialDaysLeft={tenant.trialDaysLeft} />
      <main className="flex min-w-0 flex-grow flex-col gap-4 px-4 pb-28 pt-4 lg:gap-5 lg:py-6 lg:pl-2 lg:pr-8">{children}</main>
      <BottomTabs />
    </div>
  );
}
