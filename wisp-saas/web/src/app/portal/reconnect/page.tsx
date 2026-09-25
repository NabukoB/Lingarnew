import { ReconnectForm } from "@/components/portal/ReconnectForm";
import { PortalHero, PortalSheet } from "@/components/portal/PortalHero";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { getTenant } from "@/lib/api";

export default async function Page() {
  const tenant = await getTenant();
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
