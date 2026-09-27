// Pure mappings from Go API JSON to the UI types. Kept free of Next.js
// imports so they are unit-tested with vitest.
import type {
  CheckItem,
  HotspotPackage,
  Location,
  Overview,
  Payment,
  Plan,
  RevenueSeries,
  RevenueSplit,
  RouterRow,
  RouterStatus,
  Subscriber,
  SubscriberStatus,
  Tenant,
} from "./types";

export type ApiTenant = {
  id: string;
  email: string;
  name: string;
  slug: string;
  account_prefix: string;
  support_phone: string | null;
  mpesa_mode: "platform" | "own";
  mpesa_shortcode_type: "till" | "paybill";
  mpesa_shortcode: string | null;
  mpesa_store_number: string | null;
  mpesa_env: string;
  mpesa_own_credentials_set: boolean;
  sms_credits: number;
  sms_sender: string | null;
  reminder_sms_enabled: boolean;
  hotspot_expiry_sms_enabled: boolean;
  hotspot_expiry_sms_template: string | null;
  subscription_status: "trial" | "active" | "lapsed";
  trial_ends_at: string;
  subscription_expires_at: string | null;
  trial_days_left: number | null;
  grace_hours: number;
  portal_domain: string | null;
  logo_url: string | null;
  primary_color: string;
  timezone: string;
};

export type ApiRouter = {
  id: string;
  location_id: string;
  location_name?: string;
  name: string;
  status: "pending" | "online" | "degraded" | "offline" | "misconfigured";
  tunnel_ip: string;
  board_name: string | null;
  firmware_version: string | null;
  hotspot_ports: string[];
  pppoe_ports: string[];
  connected: boolean;
  last_seen_at: string | null;
  status_changed_at: string;
  active_sessions: number;
};

export type ApiPayment = {
  id: string;
  kind: "hotspot" | "pppoe" | "unmatched";
  status: string;
  amount_kes: number;
  receipt: string | null;
  phone: string;
  account_id: string | null;
  name: string | null;
  plan: string | null;
  reference: string;
  at: string;
};

export type ApiSubscriber = {
  id: string;
  account_id: string;
  full_name: string;
  phone: string;
  phone_pretty: string;
  status: "active" | "expired" | "suspended" | "cancelled";
  plan_id: string | null;
  plan_name?: string | null;
  plan_price_kes?: number | null;
  next_renewal_at: string | null;
  online?: boolean;
};

export type ApiPlan = {
  id: string;
  name: string;
  access_type: "pppoe" | "hotspot";
  price_kes: number;
  duration_days: number | null;
  duration_minutes: number | null;
  is_trial: boolean;
  data_cap_mb: number | null;
  bandwidth_down_kbps: number;
  bandwidth_up_kbps: number;
  max_devices: number;
  is_active: boolean;
};

export type ApiPortalInfo = {
  slug: string;
  name: string;
  support_phone: string;
  primary_color: string;
  logo_url: string | null;
  shortcode_label: string;
  packages: { id: string; label: string; minutes: number; mbps: number; price_kes: number; max_devices: number; is_trial: boolean }[];
  trial: { id: string; label: string; minutes: number; mbps: number; price_kes: number; max_devices: number } | null;
};

const TZ = "Africa/Nairobi";

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? words[0]?.[1] ?? "")).toUpperCase();
}

/** 254712345678 → "0712 345 678". */
export function prettyPhone(msisdn: string | null | undefined): string {
  if (!msisdn) return "";
  const m = /^254(\d{3})(\d{3})(\d{3})$/.exec(msisdn);
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : msisdn;
}

/** 254712345678 → "0712 ••• 678". */
export function maskedPhone(msisdn: string): string {
  const p = prettyPhone(msisdn);
  const parts = p.split(" ");
  return parts.length === 3 ? `${parts[0]} ••• ${parts[2]}` : p;
}

export function toTenant(t: ApiTenant, locationName = ""): Tenant {
  return {
    name: t.name,
    initials: initials(t.name),
    accountPrefix: t.account_prefix,
    location: locationName,
    supportPhone: prettyPhone(t.support_phone),
    shortcodeType: t.mpesa_shortcode_type,
    shortcode: t.mpesa_shortcode ?? "",
    accent: t.primary_color || "#2563eb",
    trialDaysLeft: t.subscription_status === "trial" ? t.trial_days_left : null,
    slug: t.slug,
    subscriptionStatus: t.subscription_status,
    smsCredits: t.sms_credits,
  };
}

export function toOverview(o: Overview): Overview {
  return { ...o, sparkline: o.sparkline.length > 1 ? o.sparkline : [0, ...o.sparkline, o.mpesaToday] };
}

export function toSeries(r: { series: { labels: [string, string, string]; current: number[]; previous: number[] } }): RevenueSeries {
  return { labels: r.series.labels, current: r.series.current, previous: r.series.previous };
}

export function toSplit(split: { label: string; share: number; color: string }[]): RevenueSplit[] {
  return split.map(({ label, share, color }) => ({ label, share, color }));
}

export function routerStatus(s: ApiRouter["status"]): RouterStatus {
  switch (s) {
    case "online":
      return "online";
    case "degraded":
    case "misconfigured":
      return "slow";
    case "pending":
      return "pending";
    default:
      return "offline";
  }
}

export function toRouter(r: ApiRouter, now = Date.now()): RouterRow {
  const status = routerStatus(r.status);
  return {
    id: r.id,
    name: r.name,
    location: r.location_name ?? "",
    users: r.connected ? r.active_sessions : null,
    status,
    offlineMinutes: status === "offline" ? Math.max(1, Math.round((now - Date.parse(r.status_changed_at)) / 60000)) : undefined,
  };
}

export function clock(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).format(new Date(iso));
}

export function shortDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", timeZone: TZ }).format(new Date(iso));
}

export function longDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: TZ }).format(new Date(iso));
}

export function toPayment(p: ApiPayment): Payment {
  const base = { id: p.id, reference: p.reference, time: clock(p.at), amount: p.amount_kes, kind: p.kind };
  if (p.kind === "unmatched") return { ...base, who: `Account “${p.reference}”`, detail: "Match" };
  if (p.kind === "hotspot") return { ...base, who: `Hotspot · ${p.plan ?? "package"}`, detail: maskedPhone(p.phone) };
  return { ...base, who: p.account_id ?? p.reference, detail: p.plan ?? p.name ?? "" };
}

export function subscriberStatus(s: ApiSubscriber["status"]): SubscriberStatus {
  return s;
}

export function toSubscriber(s: ApiSubscriber): Subscriber {
  return {
    id: s.account_id,
    key: s.id,
    planId: s.plan_id,
    name: s.full_name,
    phone: s.phone_pretty || prettyPhone(s.phone),
    plan: s.plan_name ?? "—",
    price: s.plan_price_kes ?? 0,
    renews: s.status === "cancelled" ? null : shortDate(s.next_renewal_at),
    status: subscriberStatus(s.status),
    online: s.online === undefined ? "—" : s.online ? "Online" : "Offline",
    usedGb: 0,
    paidUntil: longDate(s.next_renewal_at),
  };
}

export function toPlan(p: ApiPlan): Plan {
  return {
    id: p.id,
    name: p.name,
    accessType: p.access_type,
    priceKes: p.price_kes,
    durationDays: p.duration_days,
    durationMinutes: p.duration_minutes,
    isTrial: p.is_trial,
    dataCapMb: p.data_cap_mb,
    downKbps: p.bandwidth_down_kbps,
    upKbps: p.bandwidth_up_kbps,
    maxDevices: p.max_devices,
    isActive: p.is_active,
  };
}

export function toLocation(l: { id: string; name: string }): Location {
  return { id: l.id, name: l.name };
}

export function toPackages(info: ApiPortalInfo): HotspotPackage[] {
  return info.packages.map((p) => ({ id: p.id, label: p.label, minutes: p.minutes, mbps: p.mbps, price: p.price_kes }));
}

export function portalTenant(info: ApiPortalInfo): Tenant {
  const [kind, code] = info.shortcode_label.includes("Paybill") ? ["paybill", info.shortcode_label.split("Paybill ")[1]] : ["till", info.shortcode_label.split("Till ")[1]];
  return {
    name: info.name,
    initials: initials(info.name),
    accountPrefix: "",
    location: "",
    supportPhone: info.support_phone,
    shortcodeType: kind as "till" | "paybill",
    shortcode: code ?? "",
    accent: info.primary_color || "#2563eb",
    trialDaysLeft: null,
    slug: info.slug,
  };
}

export function toCheckItems(items: CheckItem[]): CheckItem[] {
  return items.map(({ key, label, ok, hint }) => ({ key, label, ok, hint }));
}

/** "30 min", "3 hrs", "1 day", "1 week" for a duration in minutes. */
export function durationLabel(minutes: number): string {
  if (minutes % 10080 === 0) return `${minutes / 10080} week${minutes === 10080 ? "" : "s"}`;
  if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes === 1440 ? "" : "s"}`;
  if (minutes % 60 === 0) return `${minutes / 60} hr${minutes === 60 ? "" : "s"}`;
  return `${minutes} min`;
}

/** kbps → "5 Mbps" / "512 kbps". */
export function speedLabel(kbps: number): string {
  return kbps % 1000 === 0 ? `${kbps / 1000} Mbps` : `${kbps} kbps`;
}
