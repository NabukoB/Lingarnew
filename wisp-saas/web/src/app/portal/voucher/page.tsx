import { VoucherForm } from "@/components/portal/VoucherForm";
import { PortalHero, PortalSheet } from "@/components/portal/PortalHero";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { getPortalTenant } from "@/lib/portal";

export default async function Page() {
  const tenant = await getPortalTenant();
  return (
    <>
      <PortalHero tenant={tenant} />
      <PortalSheet>
        <PortalTabs />
        <VoucherForm />
      </PortalSheet>
    </>
  );
}
