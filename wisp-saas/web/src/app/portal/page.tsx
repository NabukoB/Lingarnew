import { BuyForm } from "@/components/portal/BuyForm";
import { PortalHero, PortalSheet } from "@/components/portal/PortalHero";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { getPortalContext, getPortalPackages, getPortalShortcodeLabel, getPortalTenant } from "@/lib/portal";

export default async function PortalBuyPage() {
  const [tenant, packages, shortcodeLabel] = await Promise.all([getPortalTenant(), getPortalPackages(), getPortalShortcodeLabel()]);
  const routerError = getPortalContext().error;
  return (
    <>
      <PortalHero tenant={tenant} />
      <PortalSheet>
        <PortalTabs />
        {packages.length === 0 ? (
          <p className="py-16 text-center text-sm font-semibold text-muted-foreground">No packages yet</p>
        ) : (
          <BuyForm packages={packages} shortcodeLabel={shortcodeLabel} notice={routerError || null} />
        )}
      </PortalSheet>
    </>
  );
}
