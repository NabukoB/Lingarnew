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
};

export type RevenueSeries = {
  labels: [string, string, string];
  current: number[];
  previous: number[];
};

export type RevenueSplit = { label: string; share: number; color: string };

export type RouterStatus = "online" | "slow" | "offline";

export type RouterRow = {
  id: string;
  name: string;
  location: string;
  users: number | null;
  status: RouterStatus;
  offlineMinutes?: number;
};

export type SubscriberStatus = "active" | "grace" | "suspended" | "cancelled";

export type Subscriber = {
  id: string;
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
};
