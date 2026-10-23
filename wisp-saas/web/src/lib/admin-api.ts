// Data for the staff admin console. Uses its own session cookie (wisp_admin,
// scoped to /admin) and the Go /admin/v1 endpoints; example data in demo mode.
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, apiFetch, isLive } from "./backend";
import type { AdminAuditEntry, AdminOverview, AdminTenantDetail, AdminTenantRow } from "./admin-types";

export const ADMIN_COOKIE = "wisp_admin";

export function adminToken(): string | null {
  return cookies().get(ADMIN_COOKIE)?.value ?? null;
}

export function setAdminToken(token: string, expires: Date) {
  cookies().set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    expires,
  });
}

export function clearAdminToken() {
  cookies().set(ADMIN_COOKIE, "", { path: "/admin", maxAge: 0 });
}

/** GET as the signed-in admin; no or expired session goes to the admin sign-in. */
export async function adminGet<T>(path: string): Promise<T> {
  const token = adminToken();
  if (!token) redirect("/admin/login");
  try {
    return await apiFetch<T>(path, { token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/admin/login?expired=1");
    if (e instanceof ApiError && e.status === 404 && e.code === "NOT_FOUND" && path.startsWith("/admin/v1/me")) {
      throw new ApiError(503, "ADMIN_OFF", "The admin console isn't switched on.", "Set ADMIN_DATABASE_URL on the API.");
    }
    throw e;
  }
}

export async function getAdmin(): Promise<{ id: string; email: string; name: string }> {
  if (!isLive()) return { id: "demo", email: "ops@mtandao.example", name: "Ops (demo)" };
  return adminGet("/admin/v1/me");
}

export async function getAdminOverview(): Promise<AdminOverview> {
  if (!isLive()) return demo.overview();
  return adminGet("/admin/v1/overview");
}

export async function getAdminTenants(q: string, standing: string): Promise<AdminTenantRow[]> {
  const unpaid = (s: string) => s === "trial_ended" || s === "expired" || s === "lapsed";
  if (!isLive())
    return demo.tenants.filter((t) => (!standing || t.standing === standing || (standing === "unpaid" && unpaid(t.standing))) && (!q || t.name.toLowerCase().includes(q.toLowerCase())));
  const p = new URLSearchParams({ q, standing });
  return (await adminGet<{ tenants: AdminTenantRow[] }>(`/admin/v1/tenants?${p}`)).tenants;
}

export async function getAdminTenant(id: string): Promise<AdminTenantDetail | null> {
  if (!isLive()) return demo.detail(id);
  try {
    return await adminGet<AdminTenantDetail>(`/admin/v1/tenants/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function getAdminAudit(): Promise<AdminAuditEntry[]> {
  if (!isLive()) return demo.audit;
  return (await adminGet<{ entries: AdminAuditEntry[] }>("/admin/v1/audit?limit=200")).entries;
}

// ── Demo data ──────────────────────────────────────────

const day = 864e5;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * day).toISOString();

const demo = {
  tenants: [
    { id: "t1", name: "Jazmoge WiFi", email: "owner@jazmoge.example", slug: "jazmoge", standing: "paying", subscription_status: "active", subscription_expires_at: iso(19), trial_ends_at: iso(-40), routers: 6, routers_online: 5, routers_offline: 1, active_subscribers: 281, sms_credits: 412, last_login_at: iso(-0.1), created_at: iso(-54) },
    { id: "t2", name: "Kilimo Net", email: "info@kilimo.example", slug: "kilimo", standing: "trial", subscription_status: "trial", subscription_expires_at: null, trial_ends_at: iso(3), routers: 2, routers_online: 2, routers_offline: 0, active_subscribers: 18, sms_credits: 0, last_login_at: iso(-1.2), created_at: iso(-11) },
    { id: "t3", name: "Ruiru Fibre & Air", email: "ops@ruiru.example", slug: "ruiru-air", standing: "paying", subscription_status: "active", subscription_expires_at: iso(41), trial_ends_at: iso(-70), routers: 11, routers_online: 11, routers_offline: 0, active_subscribers: 604, sms_credits: 1290, last_login_at: iso(-0.4), created_at: iso(-84) },
    { id: "t4", name: "Mwiki Connect", email: "mwiki@connect.example", slug: "mwiki", standing: "trial_ended", subscription_status: "trial", subscription_expires_at: null, trial_ends_at: iso(-2), routers: 1, routers_online: 0, routers_offline: 1, active_subscribers: 9, sms_credits: 0, last_login_at: iso(-5), created_at: iso(-16) },
    { id: "t5", name: "Thika Wave", email: "hello@thikawave.example", slug: "thika-wave", standing: "expired", subscription_status: "active", subscription_expires_at: iso(-3), trial_ends_at: iso(-60), routers: 3, routers_online: 3, routers_offline: 0, active_subscribers: 122, sms_credits: 35, last_login_at: iso(-9), created_at: iso(-75) },
  ].map((t) => ({ plan: "starter", mpesa_mode: "platform", ...t })) as AdminTenantRow[],
  overview(): AdminOverview {
    const income = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.now() - (29 - i) * day).toISOString().slice(0, 10);
      const subs = [3, 7, 12, 18, 25].includes(i) ? 1500 : i % 9 === 4 ? 4500 : 0;
      return { day: d, subscriptions_kes: subs, sms_credits_kes: i % 4 === 1 ? 500 : 0 };
    });
    return {
      counts: { tenants: 5, on_trial: 1, trials_ending: 1, paying: 2, lapsed: 2, routers: 23, routers_online: 21, routers_offline: 2, active_subscribers: 1034, stuck_payments: 1, unmatched_payments: 3, failed_sms: 2, assistant_questions: 37 },
      income,
      income_30d_kes: income.reduce((n, d) => n + d.subscriptions_kes + d.sms_credits_kes, 0),
      offline_routers: [
        { id: "r6", name: "Ruiru Mast", status_changed_at: iso(-0.0125), tenant_id: "t1", tenant_name: "Jazmoge WiFi" },
        { id: "m1", name: "Mwiki Main", status_changed_at: iso(-2.1), tenant_id: "t4", tenant_name: "Mwiki Connect" },
      ],
    };
  },
  audit: [
    { id: "a1", action: "GRANT_SMS_CREDITS", tenant_id: "t1", payload: { credits: 200, note: "Refund for failed top-up" }, created_at: iso(-0.2), admin_email: "ops@mtandao.example", tenant_name: "Jazmoge WiFi" },
    { id: "a2", action: "EXTEND_TRIAL", tenant_id: "t2", payload: { days: 7, note: "Router arrived late" }, created_at: iso(-1.5), admin_email: "ops@mtandao.example", tenant_name: "Kilimo Net" },
    { id: "a3", action: "LOGIN", tenant_id: null, payload: { ip: "102.0.0.4" }, created_at: iso(-1.6), admin_email: "ops@mtandao.example", tenant_name: null },
  ] as AdminAuditEntry[],
  detail(id: string): AdminTenantDetail | null {
    const t = demo.tenants.find((x) => x.id === id);
    if (!t) return null;
    return {
      ...t,
      account_prefix: t.slug.slice(0, 3).toUpperCase(),
      mpesa_shortcode_type: "paybill",
      mpesa_shortcode: "174379",
      mpesa_env: "sandbox",
      support_phone: "254712345678",
      portal_domain: null,
      timezone: "Africa/Nairobi",
      subscribers: t.active_subscribers + 14,
      routers: [
        { id: "r1", name: "Kasarani POP", status: "online", status_changed_at: iso(-3), last_seen_at: iso(0), board_name: "CCR2004-1G-12S+2XS", firmware_version: "7.15.2", location: "Kasarani" },
        { id: "r6", name: "Ruiru Mast", status: "offline", status_changed_at: iso(-0.0125), last_seen_at: iso(-0.0125), board_name: "RB4011", firmware_version: "7.14.3", location: "Ruiru" },
      ],
      platform_payments: [
        { id: "p1", purpose: "platform_subscription", amount_cents: 150000, status: "success", mpesa_receipt_number: "SJK8H2L1QZ", created_at: iso(-11) },
        { id: "p2", purpose: "sms_credits", amount_cents: 50000, status: "success", mpesa_receipt_number: "SJB1K9M3TR", created_at: iso(-4) },
      ],
      customer_payments_30d_kes: 542200,
      customer_payments_30d: 1873,
      audit: demo.audit.filter((a) => a.tenant_id === id),
    } as unknown as AdminTenantDetail;
  },
};
