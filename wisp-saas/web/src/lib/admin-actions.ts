"use server";
// Server actions for the staff admin console.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, apiFetch, isLive } from "./backend";
import { adminToken, clearAdminToken, setAdminToken } from "./admin-api";
import type { ActionResult } from "./types";

export async function adminLogin(_: unknown, form: FormData): Promise<ActionResult> {
  const body = {
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
    code: String(form.get("code") ?? "").replace(/\s/g, ""),
  };
  if (!/^\d{6}$/.test(body.code)) return { ok: false, error: "Enter the 6-digit code from your authenticator app." };
  if (isLive()) {
    try {
      const r = await apiFetch<{ token: string; expires_at: string }>("/admin/v1/login", { method: "POST", body });
      setAdminToken(r.token, new Date(r.expires_at));
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 404) return { ok: false, error: "The admin console isn't switched on.", hint: "Set ADMIN_DATABASE_URL on the API." };
        return { ok: false, error: e.message, hint: e.hint };
      }
      return { ok: false, error: "Couldn't reach the server. Try again." };
    }
  }
  redirect("/admin");
}

export async function adminLogout() {
  const token = adminToken();
  if (token && isLive()) await apiFetch("/admin/v1/logout", { method: "POST", token }).catch(() => undefined);
  clearAdminToken();
  redirect("/admin/login");
}

type Change = { kind: "trial"; days: number } | { kind: "subscription"; months: number } | { kind: "sms-credits"; credits: number };

/** Extend a trial, add subscription months or grant SMS credits; audited by the API. */
export async function adminChange(tenantId: string, change: Change, note: string): Promise<ActionResult> {
  if (!isLive()) return { ok: true, data: undefined };
  const token = adminToken();
  if (!token) redirect("/admin/login");
  const { kind, ...rest } = change;
  try {
    await apiFetch(`/admin/v1/tenants/${encodeURIComponent(tenantId)}/${kind}`, { method: "POST", token, body: { ...rest, note } });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/admin/login?expired=1");
    if (e instanceof ApiError) return { ok: false, error: e.message, hint: e.hint };
    return { ok: false, error: "Couldn't reach the server. Try again." };
  }
  revalidatePath(`/admin/tenants/${tenantId}`);
  revalidatePath("/admin/tenants");
  revalidatePath("/admin");
  return { ok: true, data: undefined };
}
