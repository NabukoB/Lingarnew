import { redirect } from "next/navigation";
import { OnlineStatus } from "@/components/portal/OnlineStatus";
import { isLive } from "@/lib/backend";
import { getPortalPackages, getPortalTenant } from "@/lib/portal";
import { purchaseStatus } from "@/lib/portal-actions";

export default async function PortalOnlinePage({ searchParams }: { searchParams: { p?: string; pkg?: string } }) {
  const [tenant, packages] = await Promise.all([getPortalTenant(), getPortalPackages()]);

  if (isLive()) {
    if (!searchParams.p) redirect("/portal");
    const r = await purchaseStatus(searchParams.p);
    if (!r.ok || r.data.state !== "active" || !r.data.expires_at) redirect("/portal");
    const s = r.data;
    const pkg = packages.find((p) => p.label === s.plan_name);
    const secondsLeft = Math.max(0, Math.round((Date.parse(s.expires_at!) - Date.now()) / 1000));
    return (
      <OnlineStatus
        tenantName={tenant.name}
        totalMinutes={pkg?.minutes ?? Math.ceil(secondsLeft / 60)}
        secondsLeft={secondsLeft}
        mbps={s.mbps}
        receipt={s.receipt}
        devicesUsed={s.devices}
        maxDevices={s.max_devices}
      />
    );
  }

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
