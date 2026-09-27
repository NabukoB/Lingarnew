import { PortalHero, PortalSheet } from "@/components/portal/PortalHero";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { TrialButton } from "@/components/portal/TrialButton";
import { getPortalTenant, getPortalTrial } from "@/lib/portal";

export default async function PortalTrialPage() {
  const [tenant, trial] = await Promise.all([getPortalTenant(), getPortalTrial()]);
  return (
    <>
      <PortalHero tenant={tenant} />
      <PortalSheet>
        <PortalTabs />
        <TrialButton label={trial?.label ?? null} />
      </PortalSheet>
    </>
  );
}
