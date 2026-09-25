import { OnlineStatus } from "@/components/portal/OnlineStatus";
import { getHotspotPackages, getTenant } from "@/lib/api";

export default async function PortalOnlinePage({ searchParams }: { searchParams: { pkg?: string } }) {
  const [tenant, packages] = await Promise.all([getTenant(), getHotspotPackages()]);
  const pkg = packages.find((p) => p.id === searchParams.pkg) ?? packages[2] ?? packages[0]!;
  return (
    <OnlineStatus
      tenantName={tenant.name}
      totalMinutes={pkg.minutes}
      mbps={pkg.mbps}
      receipt="RKT8765432"
      devicesUsed={1}
      maxDevices={2}
    />
  );
}
