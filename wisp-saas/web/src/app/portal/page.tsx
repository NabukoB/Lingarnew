import { BuyForm } from "@/components/portal/BuyForm";
import { PortalHero, PortalSheet } from "@/components/portal/PortalHero";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { getHotspotPackages, getTenant } from "@/lib/api";

export default async function PortalBuyPage() {
  const [tenant, packages] = await Promise.all([getTenant(), getHotspotPackages()]);
  const shortcodeLabel = `M-Pesa · ${tenant.shortcodeType === "till" ? "Till" : "Paybill"} ${tenant.shortcode}`;
  return (
    <>
      <PortalHero tenant={tenant} />
      <PortalSheet>
        <PortalTabs />
        <BuyForm packages={packages} shortcodeLabel={shortcodeLabel} />
      </PortalSheet>
    </>
  );
}
