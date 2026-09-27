export type Period = "day" | "week" | "month";

export type Tenant = {
  name: string;
  initials: string;
  accountPrefix: string;
  location: string;
  supportPhone: string;
  shortcodeType: "till" | "paybill";
  shortcode: string;
  accent: string;
  trialDaysLeft: number | null;
  slug?: string;
  logoUrl?: string | null;
  subscriptionStatus?: "trial" | "active" | "lapsed";
  smsCredits?: number;
};

export type RevenueSeries = {
  labels: [string, string, string];
  current: number[];
  previous: number[];
};

export type RevenueSplit = { label: string; share: number; color: string };

export type RouterStatus = "online" | "slow" | "offline" | "pending";

export type RouterRow = {
  id: string;
  name: string;
  location: string;
  users: number | null;
  status: RouterStatus;
  offlineMinutes?: number;
};

export type SubscriberStatus = "active" | "grace" | "expired" | "suspended" | "cancelled";

export type Subscriber = {
  /** Account ID shown to people, e.g. JZM1042. */
  id: string;
  /** API id (uuid); absent in example data. */
  key?: string;
  planId?: string | null;
  name: string;
  phone: string;
  plan: string;
  price: number;
  renews: string | null;
  status: SubscriberStatus;
  online: string;
  usedGb: number;
  paidUntil: string | null;
};

export type PaymentKind = "hotspot" | "pppoe" | "unmatched";

export type Payment = {
  id: string;
  reference?: string;
  kind: PaymentKind;
  who: string;
  detail: string;
  time: string;
  amount: number;
};

export type HotspotPackage = {
  id: string;
  label: string;
  minutes: number;
  mbps: number;
  price: number;
};

export type Overview = {
  mpesaToday: number;
  mpesaTodayPrev: number;
  sparkline: number[];
  online: { value: number; prev: number };
  pppoe: { value: number; prev: number };
  hotspotSales: { value: number; prev: number };
  onTimeRate: { value: number; prev: number };
  unmatched?: number;
  routers?: { online: number; total: number; offline: number };
  renewalsDue?: number;
  smsCredits?: number;
};

export type Plan = {
  id: string;
  name: string;
  accessType: "pppoe" | "hotspot";
  priceKes: number;
  durationDays: number | null;
  durationMinutes: number | null;
  isTrial: boolean;
  dataCapMb: number | null;
  downKbps: number;
  upKbps: number;
  maxDevices: number;
  isActive: boolean;
};

export type Location = { id: string; name: string };

export type CheckItem = { key: string; label: string; ok: boolean; hint?: string };

/** Result of a server action: either ok with data or a one-line error. */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; hint?: string };
