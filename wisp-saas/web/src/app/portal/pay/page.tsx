import { redirect } from "next/navigation";
import { PayStatus } from "@/components/portal/PayStatus";
import { getHotspotPackages, getTenant } from "@/lib/api";
import { normalizeKenyanPhone } from "@/lib/format";

export default async function PortalPayPage({ searchParams }: { searchParams: { pkg?: string; phone?: string } }) {
  const [tenant, packages] = await Promise.all([getTenant(), getHotspotPackages()]);
  const pkg = packages.find((p) => p.id === searchParams.pkg);
  const msisdn = normalizeKenyanPhone(searchParams.phone ?? "");
  if (!pkg || !msisdn) redirect("/portal");
  return <PayStatus tenantName={tenant.name} packageId={pkg.id} packageLabel={pkg.label} price={pkg.price} msisdn={msisdn} />;
}
