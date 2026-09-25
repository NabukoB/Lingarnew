// Example data used until the Go API (cmd/api) is wired up.
// Everything here mirrors the shapes the API will return.
import type {
  HotspotPackage,
  Overview,
  Payment,
  Period,
  RevenueSeries,
  RevenueSplit,
  RouterRow,
  Subscriber,
  Tenant,
} from "./types";

export const tenant: Tenant = {
  name: "Jazmoge WiFi",
  initials: "JW",
  accountPrefix: "JZM",
  location: "Kasarani",
  supportPhone: "0712 345 678",
  shortcodeType: "till",
  shortcode: "123456",
  accent: "#2563eb",
  trialDaysLeft: 9,
};

export const overview: Overview = {
  mpesaToday: 18420,
  mpesaTodayPrev: 17200,
  sparkline: [8, 11, 10, 14, 13, 17, 15, 19, 17, 22, 20, 25, 24],
  online: { value: 214, prev: 205 },
  pppoe: { value: 281, prev: 275 },
  hotspotSales: { value: 146, prev: 151 },
  onTimeRate: { value: 92, prev: 91 },
};

const k = (xs: number[]) => xs.map((x) => Math.round(x * 1000));

export const revenue: Record<Period, RevenueSeries> = {
  day: {
    labels: ["00:00", "12:00", "Now"],
    current: [0.2, 0.1, 0.1, 0.0, 0.1, 0.3, 0.6, 0.9, 1.1, 0.9, 0.8, 1.2, 1.5, 1.4, 1.6].map((x) => Math.round(x * 1000)),
    previous: [0.3, 0.1, 0.0, 0.1, 0.1, 0.2, 0.5, 0.8, 1.0, 1.0, 0.9, 1.1, 1.3, 1.2, 1.4].map((x) => Math.round(x * 1000)),
  },
  week: {
    labels: ["Fri", "Tue", "Today"],
    current: k([15.1, 17.8, 20.4, 23.1, 18.2, 15.4, 18.4]),
    previous: k([15.3, 15.9, 18.7, 20.2, 16.4, 14.1, 17.2]),
  },
  month: {
    labels: ["1 Sep", "15", "30"],
    current: k([14.2, 15.1, 13.8, 16.4, 18.9, 21.7, 17.3, 14.9, 15.6, 16.2, 15.1, 17.8, 20.4, 23.1, 18.2, 15.4, 16.9, 21.2, 17.5, 16.8, 19.6, 22.8, 19.9, 16.3, 17.1, 18.4, 17.9, 20.7, 24.6, 18.4]),
    previous: k([13.1, 13.9, 14.6, 13.2, 17.1, 19.8, 16.0, 13.8, 14.2, 14.9, 15.3, 15.9, 18.7, 20.2, 16.4, 14.1, 15.2, 17.9, 16.6, 15.7, 17.4, 20.1, 18.3, 15.2, 15.8, 16.7, 16.1, 18.8, 21.9, 17.3]),
  },
};

export const revenueSplit: RevenueSplit[] = [
  { label: "PPPoE", share: 0.62, color: "#2563eb" },
  { label: "Hotspot", share: 0.33, color: "#16a34a" },
  { label: "Vouchers", share: 0.05, color: "#ea580c" },
];

export const topPackages = [
  { name: "Bronze 5 Mbps", sold: 142, revenue: 213000 },
  { name: "Silver 10 Mbps", sold: 44, revenue: 88000 },
  { name: "Hotspot 1 day", sold: 1284, revenue: 77040 },
];

export const routers: RouterRow[] = [
  { id: "r6", name: "Ruiru Mast", location: "Ruiru", users: null, status: "offline", offlineMinutes: 18 },
  { id: "r3", name: "Mwiki Estate B", location: "Mwiki", users: 37, status: "slow" },
  { id: "r1", name: "Kasarani POP", location: "Kasarani", users: 70, status: "online" },
  { id: "r4", name: "Thika Rd Mall", location: "Thika Rd", users: 48, status: "online" },
  { id: "r2", name: "Tower Alpha", location: "Kasarani", users: 41, status: "online" },
  { id: "r5", name: "Githurai Sec. 2", location: "Githurai", users: 18, status: "online" },
];

export const payments: Payment[] = [
  { id: "p1", kind: "hotspot", who: "Hotspot · 1 day", detail: "0712 ••• 678", time: "14:32", amount: 60 },
  { id: "p2", kind: "pppoe", who: "JZM1042", detail: "Bronze", time: "14:29", amount: 1500 },
  { id: "p3", kind: "pppoe", who: "JZM1077", detail: "Silver", time: "14:20", amount: 2000 },
  { id: "p4", kind: "unmatched", who: "Account “JOHN”", detail: "Match", time: "14:11", amount: 1500 },
];

export const subscribers: Subscriber[] = [
  { id: "JZM1042", name: "Mary Wanjiku", phone: "0712 345 678", plan: "Bronze 5 Mbps", price: 1500, renews: "24 Oct", status: "active", online: "Online 2h", usedGb: 86.4, paidUntil: "24 Oct 2026" },
  { id: "JZM1043", name: "Peter Otieno", phone: "0722 118 430", plan: "Silver 10 Mbps", price: 2000, renews: "26 Sep", status: "active", online: "Online 5d", usedGb: 142.1, paidUntil: "26 Sep 2026" },
  { id: "JZM1051", name: "Grace Achieng", phone: "0701 992 015", plan: "Bronze 5 Mbps", price: 1500, renews: "27 Sep", status: "active", online: "Offline", usedGb: 40.2, paidUntil: "27 Sep 2026" },
  { id: "JZM1058", name: "Kevin Mwangi", phone: "0733 450 212", plan: "Gold 20 Mbps", price: 3500, renews: "23 Sep", status: "grace", online: "Online 1d", usedGb: 210.9, paidUntil: "23 Sep 2026" },
  { id: "JZM1060", name: "Faith Njeri", phone: "0714 330 981", plan: "Bronze 5 Mbps", price: 1500, renews: "19 Sep", status: "suspended", online: "Blocked", usedGb: 51.0, paidUntil: "19 Sep 2026" },
  { id: "JZM1063", name: "Brian Kiprono", phone: "0798 002 614", plan: "Silver 10 Mbps", price: 2000, renews: "12 Oct", status: "active", online: "Online 9h", usedGb: 99.7, paidUntil: "12 Oct 2026" },
  { id: "JZM1071", name: "Esther Mutua", phone: "0720 771 309", plan: "Bronze 5 Mbps", price: 1500, renews: "02 Oct", status: "active", online: "Online 3d", usedGb: 63.3, paidUntil: "02 Oct 2026" },
  { id: "JZM1077", name: "Peter Kamau", phone: "0711 604 553", plan: "Silver 10 Mbps", price: 2000, renews: "24 Oct", status: "active", online: "Online 40m", usedGb: 12.8, paidUntil: "24 Oct 2026" },
  { id: "JZM1080", name: "Lucy Wairimu", phone: "0745 208 117", plan: "Bronze 5 Mbps", price: 1500, renews: "15 Sep", status: "suspended", online: "Blocked", usedGb: 44.5, paidUntil: "15 Sep 2026" },
  { id: "JZM1084", name: "Samuel Ouma", phone: "0702 915 440", plan: "Gold 20 Mbps", price: 3500, renews: "09 Oct", status: "active", online: "Online 2d", usedGb: 301.2, paidUntil: "09 Oct 2026" },
  { id: "JZM1090", name: "Ann Chebet", phone: "0727 551 006", plan: "Bronze 5 Mbps", price: 1500, renews: null, status: "cancelled", online: "—", usedGb: 0, paidUntil: null },
  { id: "JZM1093", name: "Dennis Kariuki", phone: "0716 443 890", plan: "Silver 10 Mbps", price: 2000, renews: "30 Sep", status: "active", online: "Offline", usedGb: 77.6, paidUntil: "30 Sep 2026" },
];

export const hotspotPackages: HotspotPackage[] = [
  { id: "h30m", label: "30 min", minutes: 30, mbps: 5, price: 10 },
  { id: "h3h", label: "3 hrs", minutes: 180, mbps: 5, price: 30 },
  { id: "h1d", label: "1 day", minutes: 1440, mbps: 5, price: 60 },
  { id: "h1w", label: "1 week", minutes: 10080, mbps: 8, price: 300 },
];

export const onboarding = {
  location: "Kasarani POP",
  command:
    '/tool fetch url="https://api.yourwifisaas.com/onboard/7Qk2vN9xPz4mLr8TbW3s" dst-path=wisp-setup.rsc; :delay 2s; /import wisp-setup.rsc',
  log: [
    "WISP setup: RouterOS 7.15.2 ... ok",
    "WISP setup: internet ... ok (8 ms)",
    "WISP setup: tunnel ... done",
    "WISP setup: RADIUS, PPPoE, Hotspot ... done",
    "Setup complete. Router will dial home in ~10 seconds.",
  ],
  router: "hAP ax³ · 7.15.2 · 47 s",
  checks: [
    { label: "Pre-flight checks", detail: "v7.15.2 · internet ok" },
    { label: "WireGuard tunnel", detail: "10.200.3.17" },
    { label: "RADIUS", detail: "pppoe + hotspot" },
    { label: "PPPoE server", detail: "bridge-lan" },
    { label: "Hotspot + portal", detail: "bridge-public" },
    { label: "Walled garden", detail: "3 hosts" },
    { label: "Anti-bypass firewall", detail: "14 rules" },
    { label: "Packages loaded", detail: "4 hotspot · 3 PPPoE" },
  ],
};
