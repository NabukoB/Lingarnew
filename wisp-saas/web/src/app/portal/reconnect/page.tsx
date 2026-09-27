import { ReconnectForm } from "@/components/portal/ReconnectForm";
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
        <ReconnectForm />
      </PortalSheet>
    </>
  );
}
