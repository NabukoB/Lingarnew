"use server";
// Captive-portal actions. They run on the portal server, so the device's MAC
// and router come from the wisp_portal cookie, never from the browser form.
import { ApiError, apiFetch, isLive } from "./backend";
import { getPortalContext, getPortalInfo, portalURL } from "./portal";

export type PurchaseState = {
  id: string;
  state: "pending" | "active" | "failed" | "expired";
  message: string;
  plan_name: string;
  price_kes: number;
  phone: string;
  receipt: string | null;
  expires_at: string | null;
  devices: number;
  max_devices: number;
  mbps: number;
  login_username?: string;
};

export type PortalResult<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  if (e instanceof ApiError) return { ok: false, error: e.message };
  return { ok: false, error: "No connection. Try again." };
}

async function slug(): Promise<string> {
  const info = await getPortalInfo();
  if (!info) throw new ApiError(404, "NO_TENANT", "Open this page from the Wi-Fi login.");
  return info.slug;
}

/**
 * Where to send the browser once the device is paid: the router's hotspot
 * login (which signs the device in with its MAC and bounces back to
 * /portal/online), or straight to /portal/online when previewing off-network.
 */
export async function loginURL(purchaseId: string): Promise<string> {
  const ctx = getPortalContext();
  const online = portalURL(`/portal/online?p=${encodeURIComponent(purchaseId)}`);
  if (!ctx.link || !ctx.mac || !/^https?:\/\//.test(ctx.link)) return `/portal/online?p=${encodeURIComponent(purchaseId)}`;
  const u = new URL(ctx.link);
  u.searchParams.set("username", ctx.mac);
  u.searchParams.set("password", ctx.mac);
  u.searchParams.set("dst", online);
  return u.toString();
}

export async function buyPackage(packageId: string, phone: string): Promise<PortalResult<{ purchaseId: string }>> {
  if (!isLive()) return { ok: true, data: { purchaseId: "demo-" + packageId } };
  const ctx = getPortalContext();
  try {
    const r = await apiFetch<{ purchase_id: string }>(`/v1/portal/${encodeURIComponent(await slug())}/buy`, {
      method: "POST",
      body: { package_id: packageId, phone, mac: ctx.mac ?? "", router_id: ctx.router ?? "" },
    });
    return { ok: true, data: { purchaseId: r.purchase_id } };
  } catch (e) {
    return fail(e);
  }
}

export async function purchaseStatus(purchaseId: string): Promise<PortalResult<PurchaseState & { next?: string }>> {
  if (!isLive() || purchaseId.startsWith("demo-")) {
    return { ok: true, data: { id: purchaseId, state: "pending", message: "", plan_name: "", price_kes: 0, phone: "", receipt: null, expires_at: null, devices: 1, max_devices: 1, mbps: 5 } };
  }
  const ctx = getPortalContext();
  try {
    const s = await apiFetch<PurchaseState>(
      `/v1/portal/${encodeURIComponent(await slug())}/purchases/${encodeURIComponent(purchaseId)}?mac=${encodeURIComponent(ctx.mac ?? "")}`,
    );
    return { ok: true, data: s.state === "active" ? { ...s, next: await loginURL(s.id) } : s };
  } catch (e) {
    return fail(e);
  }
}

async function codeAction(path: string, body: Record<string, string>): Promise<PortalResult<{ next: string }>> {
  const ctx = getPortalContext();
  try {
    const r = await apiFetch<{ purchase_id: string }>(`/v1/portal/${encodeURIComponent(await slug())}/${path}`, {
      method: "POST",
      body: { ...body, mac: ctx.mac ?? "", ...(path === "reconnect" ? {} : { router_id: ctx.router ?? "" }) },
    });
    return { ok: true, data: { next: await loginURL(r.purchase_id) } };
  } catch (e) {
    return fail(e);
  }
}

export async function reconnect(receipt: string): Promise<PortalResult<{ next: string }>> {
  if (!isLive()) return { ok: true, data: { next: "/portal/online" } };
  return codeAction("reconnect", { receipt });
}

export async function redeemVoucher(code: string): Promise<PortalResult<{ next: string }>> {
  if (!isLive()) return { ok: true, data: { next: "/portal/online?pkg=h1d" } };
  return codeAction("voucher", { code });
}

export async function startTrial(): Promise<PortalResult<{ next: string }>> {
  if (!isLive()) return { ok: true, data: { next: "/portal/online?pkg=h30m" } };
  return codeAction("trial", {});
}
