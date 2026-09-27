import { redirect } from "next/navigation";
import { PayStatus } from "@/components/portal/PayStatus";
import { normalizeKenyanPhone } from "@/lib/format";
import { getPortalPackages, getPortalTenant } from "@/lib/portal";

export default async function PortalPayPage({ searchParams }: { searchParams: { p?: string; pkg?: string; phone?: string } }) {
  const [tenant, packages] = await Promise.all([getPortalTenant(), getPortalPackages()]);
  const pkg = packages.find((p) => p.id === searchParams.pkg);
  const msisdn = normalizeKenyanPhone(searchParams.phone ?? "");
  if (!pkg || !msisdn || !searchParams.p) redirect("/portal");
  return (
    <PayStatus
      tenantName={tenant.name}
      purchaseId={searchParams.p}
      packageId={pkg.id}
      packageLabel={pkg.label}
      price={pkg.price}
      msisdn={msisdn}
    />
  );
}
