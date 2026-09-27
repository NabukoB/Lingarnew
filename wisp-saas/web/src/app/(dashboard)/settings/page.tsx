import { Check } from "lucide-react";
import Link from "next/link";
import { Stagger, StaggerItem } from "@/components/motion";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { SettingsTabs } from "@/components/settings/common";
import { getPlans, getRouters, getSettings } from "@/lib/api";

export const metadata = { title: "Settings · Mtandao" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: { welcome?: string } }) {
  const tenant = await getSettings();
  const [plans, routers] = searchParams.welcome === "1" ? await Promise.all([getPlans(), getRouters()]) : [[], []];
  const steps = tenant
    ? [
        { label: "Till / Paybill", done: !!tenant.mpesa_shortcode, href: "/settings" },
        { label: "Support phone", done: !!tenant.support_phone, href: "/settings" },
        { label: "Packages", done: plans.length > 0, href: "/packages" },
        { label: "Add router", done: routers.length > 0, href: "/routers/new" },
      ]
    : [];
  return (
    <>
      <SettingsTabs />
      {searchParams.welcome === "1" && (
        <Stagger as="section" className="grid grid-cols-2 gap-2 rounded-card bg-gradient-to-br from-blue-700 to-blue-500 p-4 text-[13px] font-bold text-white shadow-brand sm:grid-cols-4">
          {steps.map((s, i) => (
            <StaggerItem key={s.label}>
              <Link href={s.href} className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition hover:bg-white/10">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${s.done ? "bg-white text-blue-700" : "bg-white/20"}`}>
                  {s.done ? <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </span>
                {s.label}
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
      {tenant ? <GeneralSettings tenant={tenant} /> : <p className="py-12 text-center text-sm font-semibold text-muted-foreground">Connect the API to edit settings</p>}
    </>
  );
}
