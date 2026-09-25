import { Gift } from "lucide-react";
import Link from "next/link";
import { PortalHero, PortalSheet } from "@/components/portal/PortalHero";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { primaryButtonClass } from "@/components/portal/PrimaryButton";
import { getTenant } from "@/lib/api";

export default async function PortalTrialPage() {
  const tenant = await getTenant();
  return (
    <>
      <PortalHero tenant={tenant} />
      <PortalSheet>
        <PortalTabs />
        <div className="mt-3 flex flex-col items-center gap-2">
          <span className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-blue-50" style={{ color: "var(--accent)" }}>
            <Gift aria-hidden size={30} strokeWidth={2} />
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight">15 min free</h1>
          <span className="text-[13px] font-semibold text-slate-500">Once a day per device</span>
        </div>
        <div className="mt-auto pb-6 pt-3">
          <Link href="/portal/online?pkg=h30m" className={primaryButtonClass} style={{ background: "var(--accent)" }}>
            Start free trial
          </Link>
        </div>
      </PortalSheet>
    </>
  );
}
