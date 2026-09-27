// Captive-portal data. The router's login page sends the device here with
// ?t=<tenant slug>&mac=..&link=<hotspot login URL>&router=<id>; middleware
// keeps those in the wisp_portal cookie so every portal page knows them.
import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { ApiError, apiFetch, isLive } from "./backend";
import { portalTenant, toPackages, type ApiPortalInfo } from "./mappers";
import * as mock from "./mock";
import type { HotspotPackage, Tenant } from "./types";

export const PORTAL_COOKIE = "wisp_portal";

export type PortalContext = { t?: string; mac?: string; link?: string; router?: string; error?: string };

export function parsePortalCookie(raw: string | undefined): PortalContext {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as PortalContext;
    return typeof v === "object" && v ? v : {};
  } catch {
    return {};
  }
}

export function getPortalContext(): PortalContext {
  return parsePortalCookie(cookies().get(PORTAL_COOKIE)?.value);
}

export function portalHost(): string {
  const h = headers();
  return (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(":")[0] ?? "";
}

/** Absolute URL of a portal page, for the router's post-login redirect. */
export function portalURL(path: string): string {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  // On the portal hostname, middleware maps "/x" to "/portal/x"; keep URLs short there.
  const p = isPortalHost(host) ? path.replace(/^\/portal(?=\/|$)/, "") || "/" : path;
  return `${proto}://${host}${p}`;
}

/** Hosts that serve the captive portal at their root (see middleware). */
export function isPortalHost(host: string): boolean {
  const h = host.split(":")[0] ?? "";
  if (h.startsWith("portal.")) return true;
  const dash = (process.env.DASHBOARD_HOSTS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return dash.length > 0 && !dash.includes(h) && h !== "localhost";
}

export class PortalNotFound extends Error {}

export const getPortalInfo = cache(async (): Promise<ApiPortalInfo | null> => {
  if (!isLive()) return null;
  const ctx = getPortalContext();
  const path = ctx.t ? `/v1/portal/${encodeURIComponent(ctx.t)}/` : `/v1/portal/by-domain/${encodeURIComponent(portalHost())}`;
  try {
    return await apiFetch<ApiPortalInfo>(path);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) throw new PortalNotFound();
    throw e;
  }
});

export async function getPortalTenant(): Promise<Tenant> {
  const info = await getPortalInfo();
  return info ? portalTenant(info) : mock.tenant;
}

export async function getPortalPackages(): Promise<HotspotPackage[]> {
  const info = await getPortalInfo();
  return info ? toPackages(info) : mock.hotspotPackages;
}

export async function getPortalTrial(): Promise<HotspotPackage | null> {
  const info = await getPortalInfo();
  if (!info) return { id: "trial", label: "15 min", minutes: 15, mbps: 2, price: 0 };
  const t = info.trial;
  return t ? { id: t.id, label: t.label, minutes: t.minutes, mbps: t.mbps, price: 0 } : null;
}

export async function getPortalShortcodeLabel(): Promise<string> {
  const info = await getPortalInfo();
  if (info) return info.shortcode_label;
  return `M-Pesa · ${mock.tenant.shortcodeType === "till" ? "Till" : "Paybill"} ${mock.tenant.shortcode}`;
}
