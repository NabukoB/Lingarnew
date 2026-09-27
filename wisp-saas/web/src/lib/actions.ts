"use server";
// Server actions for the dashboard. Each returns a one-line error the UI can
// show as-is (the Go API already words them for people).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, apiFetch, isLive } from "./backend";
import { clearToken, getToken, setToken } from "./session";
import type { ActionResult, CheckItem } from "./types";

function fail(e: unknown): { ok: false; error: string; hint?: string } {
  if (e instanceof ApiError) return { ok: false, error: e.message, hint: e.hint };
  return { ok: false, error: "Couldn't reach the server. Try again." };
}

async function call<T>(method: string, path: string, body?: unknown): Promise<ActionResult<T>> {
  if (!isLive()) return { ok: false, error: "Demo mode: connect the API to save changes." };
  const token = getToken();
  if (!token) redirect("/login");
  try {
    return { ok: true, data: await apiFetch<T>(path, { method, body, token }) };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/login?expired=1");
    return fail(e);
  }
}

// ── Auth ─────────────────────────────────────────────

export async function login(_: unknown, form: FormData): Promise<ActionResult> {
  if (!isLive()) redirect("/");
  try {
    const r = await apiFetch<{ token: string }>("/v1/auth/login", {
      method: "POST",
      body: { email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") },
    });
    setToken(r.token);
  } catch (e) {
    return fail(e);
  }
  redirect("/");
}

export async function signup(_: unknown, form: FormData): Promise<ActionResult> {
  if (!isLive()) redirect("/");
  try {
    const r = await apiFetch<{ token: string }>("/v1/auth/signup", {
      method: "POST",
      body: {
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        business_name: String(form.get("business_name") ?? ""),
        account_prefix: String(form.get("account_prefix") ?? "") || undefined,
        support_phone: String(form.get("support_phone") ?? "") || undefined,
        shortcode_type: String(form.get("shortcode_type") ?? "") || undefined,
        shortcode: String(form.get("shortcode") ?? "") || undefined,
      },
    });
    setToken(r.token);
  } catch (e) {
    return fail(e);
  }
  redirect("/settings?welcome=1");
}

export async function prefixSuggestions(name: string): Promise<string[]> {
  if (!isLive() || name.trim().length < 2) return [];
  try {
    const r = await apiFetch<{ prefixes?: string[]; suggestions?: string[] }>(`/v1/auth/prefix-suggestions?name=${encodeURIComponent(name)}`);
    return r.prefixes ?? r.suggestions ?? [];
  } catch {
    return [];
  }
}

export async function logout() {
  const token = getToken();
  if (isLive() && token) {
    try {
      await apiFetch("/v1/auth/logout", { method: "POST", token });
    } catch {
      /* the cookie goes anyway */
    }
  }
  clearToken();
  redirect("/login");
}

// ── Customers ────────────────────────────────────────

export type NewSubscriber = { full_name: string; phone: string; plan_id: string; start_now: boolean; physical_address?: string };

export async function createSubscriber(input: NewSubscriber): Promise<ActionResult<{ accountId: string; password: string }>> {
  const r = await call<{ subscriber: { account_id: string }; pppoe_password: string }>("POST", "/v1/subscribers", input);
  if (!r.ok) return r;
  revalidatePath("/customers");
  return { ok: true, data: { accountId: r.data.subscriber.account_id, password: r.data.pppoe_password } };
}

export async function setSubscriberStatus(key: string, action: "suspend" | "reactivate" | "cancel"): Promise<ActionResult> {
  const r = await call(`POST`, `/v1/subscribers/${encodeURIComponent(key)}/${action}`);
  if (!r.ok) return r;
  revalidatePath("/customers");
  return { ok: true, data: undefined };
}

export async function changePlan(key: string, planId: string): Promise<ActionResult> {
  const cur = await call<Record<string, unknown>>("GET", `/v1/subscribers/${encodeURIComponent(key)}`);
  if (!cur.ok) return cur;
  const s = cur.data;
  const r = await call("PUT", `/v1/subscribers/${encodeURIComponent(key)}`, {
    full_name: s.full_name, phone: s.phone, email: s.email ?? "", physical_address: s.physical_address ?? "", plan_id: planId,
  });
  if (!r.ok) return r;
  revalidatePath("/customers");
  return { ok: true, data: undefined };
}

export async function revealPassword(key: string): Promise<ActionResult<string>> {
  const r = await call<{ pppoe_password: string }>("GET", `/v1/subscribers/${encodeURIComponent(key)}/password`);
  return r.ok ? { ok: true, data: r.data.pppoe_password } : r;
}

export async function sendSTK(key: string): Promise<ActionResult<{ transactionId: string; message: string }>> {
  const r = await call<{ transaction_id: string; message: string }>("POST", `/v1/subscribers/${encodeURIComponent(key)}/stk-push`);
  return r.ok ? { ok: true, data: { transactionId: r.data.transaction_id, message: r.data.message } } : r;
}

export async function transactionStatus(id: string): Promise<ActionResult<{ status: string; message: string; receipt: string | null }>> {
  return call("GET", `/v1/transactions/${encodeURIComponent(id)}`);
}

export async function matchPayment(paymentId: string, accountId: string): Promise<ActionResult> {
  const subs = await call<{ subscribers: { id: string; account_id: string }[] }>("GET", `/v1/subscribers?q=${encodeURIComponent(accountId.trim())}&limit=5`);
  if (!subs.ok) return subs;
  const sub = subs.data.subscribers.find((s) => s.account_id.toUpperCase() === accountId.trim().toUpperCase());
  if (!sub) return { ok: false, error: "No customer with that account ID." };
  const r = await call("POST", `/v1/payments/${encodeURIComponent(paymentId)}/match`, { subscriber_id: sub.id });
  if (!r.ok) return r;
  revalidatePath("/money");
  revalidatePath("/");
  return { ok: true, data: undefined };
}

// ── Packages + vouchers ──────────────────────────────

export type PlanForm = {
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

export async function savePlan(id: string | null, form: PlanForm): Promise<ActionResult> {
  const r = id ? await call("PUT", `/v1/plans/${encodeURIComponent(id)}`, form) : await call("POST", "/v1/plans", form);
  if (!r.ok) return r;
  revalidatePath("/packages");
  return { ok: true, data: undefined };
}

export async function createVouchers(planId: string, count: number, batch: string): Promise<ActionResult<string[]>> {
  const r = await call<{ vouchers: { code: string }[] }>("POST", "/v1/vouchers", { plan_id: planId, count, batch });
  if (!r.ok) return r;
  revalidatePath("/vouchers");
  return { ok: true, data: r.data.vouchers.map((v) => v.code) };
}

// ── Routers ──────────────────────────────────────────

export type Setup = { command: string; expires_at: string };

export async function createRouter(input: { location_id: string; name: string; hotspot_ports: string[]; pppoe_ports: string[] }): Promise<ActionResult<{ id: string; setup: Setup }>> {
  const r = await call<{ router: { id: string }; setup: Setup }>("POST", "/v1/routers", input);
  if (!r.ok) return r;
  revalidatePath("/network");
  return { ok: true, data: { id: r.data.router.id, setup: r.data.setup } };
}

export async function createLocation(name: string): Promise<ActionResult<{ id: string; name: string }>> {
  return call("POST", "/v1/locations", { name, address: "" });
}

export async function newSetupCommand(id: string): Promise<ActionResult<Setup>> {
  return call("POST", `/v1/routers/${encodeURIComponent(id)}/setup-command`);
}

export type RouterProgress = { status: string; connected: boolean; board: string | null; version: string | null; items: CheckItem[] };

export async function routerProgress(id: string): Promise<ActionResult<RouterProgress>> {
  const r = await call<{ status: string; connected: boolean; board_name: string | null; firmware_version: string | null }>("GET", `/v1/routers/${encodeURIComponent(id)}`);
  if (!r.ok) return r;
  let items: CheckItem[] = [];
  if (r.data.status === "online" || r.data.status === "degraded") {
    const c = await call<{ items: CheckItem[] }>("GET", `/v1/routers/${encodeURIComponent(id)}/checklist`);
    if (c.ok) items = c.data.items;
  }
  return { ok: true, data: { status: r.data.status, connected: r.data.connected, board: r.data.board_name, version: r.data.firmware_version, items } };
}

export async function syncRouter(id: string): Promise<ActionResult<number>> {
  const r = await call<{ changes: unknown[] }>("POST", `/v1/routers/${encodeURIComponent(id)}/sync`);
  if (!r.ok) return r;
  revalidatePath("/network");
  return { ok: true, data: r.data.changes.length };
}

export async function deleteRouter(id: string): Promise<ActionResult> {
  const r = await call("DELETE", `/v1/routers/${encodeURIComponent(id)}`);
  if (!r.ok) return r;
  revalidatePath("/network");
  return { ok: true, data: undefined };
}

// ── Settings + our billing ───────────────────────────

export async function saveSettings(input: Record<string, unknown>): Promise<ActionResult> {
  const r = await call("PUT", "/v1/settings", input);
  if (!r.ok) return r;
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function saveMpesaCredentials(input: { consumer_key: string; consumer_secret: string; passkey: string }): Promise<ActionResult> {
  return call("PUT", "/v1/settings/mpesa-credentials", input);
}

export async function registerC2B(): Promise<ActionResult> {
  return call("POST", "/v1/mpesa/register-c2b");
}

export async function changePassword(current: string, next: string): Promise<ActionResult> {
  return call("POST", "/v1/settings/password", { current_password: current, new_password: next });
}

export async function paySubscription(phone: string, months: number): Promise<ActionResult<{ transactionId: string; amount: number }>> {
  const r = await call<{ transaction_id: string; amount_kes: number }>("POST", "/v1/billing/subscription", { phone, months });
  return r.ok ? { ok: true, data: { transactionId: r.data.transaction_id, amount: r.data.amount_kes } } : r;
}

export async function buySMSCredits(phone: string, credits: number): Promise<ActionResult<{ transactionId: string; amount: number }>> {
  const r = await call<{ transaction_id: string; amount_kes: number }>("POST", "/v1/billing/sms-credits", { phone, credits });
  return r.ok ? { ok: true, data: { transactionId: r.data.transaction_id, amount: r.data.amount_kes } } : r;
}

// ── Search (⌘K) ──────────────────────────────────────

export type SearchHit = { kind: "customer" | "router"; id: string; title: string; subtitle: string; href: string };

export async function searchAll(q: string): Promise<SearchHit[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  if (!isLive()) {
    const { subscribers, routers } = await import("./mock");
    const t = query.toLowerCase();
    return [
      ...subscribers
        .filter((s) => s.name.toLowerCase().includes(t) || s.id.toLowerCase().includes(t))
        .slice(0, 6)
        .map((s) => ({ kind: "customer" as const, id: s.id, title: s.name, subtitle: s.id, href: `/customers?c=${s.id}` })),
      ...routers
        .filter((r) => r.name.toLowerCase().includes(t))
        .map((r) => ({ kind: "router" as const, id: r.id, title: r.name, subtitle: r.location, href: `/routers/${r.id}` })),
    ];
  }
  const [subs, routers] = await Promise.all([
    call<{ subscribers: { id: string; account_id: string; full_name: string; phone_pretty: string }[] }>("GET", `/v1/subscribers?q=${encodeURIComponent(query)}&limit=6`),
    call<{ routers: { id: string; name: string; location_name?: string }[] }>("GET", "/v1/routers"),
  ]);
  const hits: SearchHit[] = [];
  if (subs.ok) {
    for (const s of subs.data.subscribers) {
      hits.push({ kind: "customer", id: s.id, title: s.full_name, subtitle: `${s.account_id} · ${s.phone_pretty}`, href: `/customers?c=${s.account_id}` });
    }
  }
  if (routers.ok) {
    const t = query.toLowerCase();
    for (const r of routers.data.routers.filter((r) => r.name.toLowerCase().includes(t)).slice(0, 5)) {
      hits.push({ kind: "router", id: r.id, title: r.name, subtitle: r.location_name ?? "", href: `/routers/${r.id}` });
    }
  }
  return hits;
}
