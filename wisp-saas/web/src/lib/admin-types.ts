// Shapes returned by the Go admin API (/admin/v1), as the console uses them.

export type Standing = "trial" | "trial_ended" | "paying" | "expired" | "lapsed";

export type AdminCounts = {
  tenants: number;
  on_trial: number;
  trials_ending: number;
  paying: number;
  lapsed: number;
  routers: number;
  routers_online: number;
  routers_offline: number;
  active_subscribers: number;
  stuck_payments: number;
  unmatched_payments: number;
  failed_sms: number;
  assistant_questions: number;
};

export type AdminOverview = {
  counts: AdminCounts;
  income: { day: string; subscriptions_kes: number; sms_credits_kes: number }[];
  income_30d_kes: number;
  offline_routers: { id: string; name: string; status_changed_at: string; tenant_id: string; tenant_name: string }[];
};

export type AdminTenantRow = {
  id: string;
  name: string;
  email: string;
  slug: string;
  plan: string;
  mpesa_mode: string;
  subscription_status: string;
  trial_ends_at: string;
  subscription_expires_at: string | null;
  sms_credits: number;
  created_at: string;
  routers: number;
  routers_online: number;
  routers_offline: number;
  active_subscribers: number;
  last_login_at: string | null;
  standing: Standing;
};

export type AdminAuditEntry = {
  id: string;
  action: string;
  tenant_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  admin_email: string;
  tenant_name: string | null;
};

export type AdminTenantDetail = {
  id: string;
  name: string;
  email: string;
  slug: string;
  account_prefix: string;
  plan: string;
  mpesa_mode: string;
  mpesa_shortcode_type: string;
  mpesa_shortcode: string | null;
  mpesa_env: string;
  support_phone: string | null;
  portal_domain: string | null;
  timezone: string;
  subscription_status: string;
  trial_ends_at: string;
  subscription_expires_at: string | null;
  sms_credits: number;
  created_at: string;
  subscribers: number;
  active_subscribers: number;
  last_login_at: string | null;
  standing: Standing;
  routers: { id: string; name: string; status: string; status_changed_at: string; last_seen_at: string | null; board_name: string | null; firmware_version: string | null; location: string }[];
  platform_payments: { id: string; purpose: string; amount_cents: number; status: string; mpesa_receipt_number: string | null; created_at: string }[];
  customer_payments_30d_kes: number;
  customer_payments_30d: number;
  audit: AdminAuditEntry[];
};

export const standingLabel: Record<Standing, string> = {
  trial: "Trial",
  trial_ended: "Trial ended",
  paying: "Paying",
  expired: "Expired",
  lapsed: "Lapsed",
};

/** Badge tone per standing: good = paying, attention = trial, failed = everything lapsed. */
export function standingTone(s: Standing): "success" | "warning" | "danger" | "default" {
  if (s === "paying") return "success";
  if (s === "trial") return "default";
  return "danger";
}

/** One-line description of an audit entry. */
export function auditText(e: AdminAuditEntry): string {
  const p = e.payload ?? {};
  switch (e.action) {
    case "LOGIN":
      return "Signed in";
    case "EXTEND_TRIAL":
      return `Trial +${p.days} days`;
    case "ADD_SUBSCRIPTION":
      return `Subscription +${p.months} month${p.months === 1 ? "" : "s"}`;
    case "GRANT_SMS_CREDITS":
      return `+${p.credits} SMS credits`;
    default:
      return e.action.toLowerCase().replace(/_/g, " ");
  }
}

/** "just now", "12 min ago", "5 h ago", "3 d ago"; future dates as "in 3 d". */
export function ago(iso: string | null, now = Date.now()): string {
  if (!iso) return "never";
  const diff = now - Date.parse(iso);
  const future = diff < 0;
  const m = Math.round(Math.abs(diff) / 60000);
  const v = m < 1 ? "" : m < 60 ? `${m} min` : m < 48 * 60 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`;
  if (!v) return "just now";
  return future ? `in ${v}` : `${v} ago`;
}
