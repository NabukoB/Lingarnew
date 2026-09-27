import type { Alert } from "@/components/shell/Notifications";
import type { Overview, Tenant } from "./types";

/** Real alerts for the bell and the nav badges. */
export function alertsFrom(overview: Overview, tenant: Tenant): Alert[] {
  const out: Alert[] = [];
  const offline = overview.routers?.offline ?? 0;
  if (offline > 0) out.push({ key: "routers", text: `${offline} router${offline > 1 ? "s" : ""} offline`, href: "/network", tone: "red" });
  if (overview.unmatched) out.push({ key: "unmatched", text: `${overview.unmatched} payment${overview.unmatched > 1 ? "s" : ""} to match`, href: "/money", tone: "amber" });
  if (tenant.smsCredits === 0) out.push({ key: "sms", text: "No SMS credits", href: "/settings/sms", tone: "amber" });
  if (overview.renewalsDue) out.push({ key: "renewals", text: `${overview.renewalsDue} renewal${overview.renewalsDue > 1 ? "s" : ""} in 3 days`, href: "/customers", tone: "amber" });
  return out;
}
