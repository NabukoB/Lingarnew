// Data access for the dashboard. With API_URL set it calls the Go API
// (cmd/api) with the signed-in WISP's token; without it, it returns the
// example data in ./mock so the UI can be developed on its own.
import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ApiError, apiFetch, isLive } from "./backend";
import {
  toLocation,
  toOverview,
  toPayment,
  toPlan,
  toRouter,
  toSeries,
  toSplit,
  toSubscriber,
  toTenant,
  type ApiPayment,
  type ApiPlan,
  type ApiRouter,
  type ApiSubscriber,
  type ApiTenant,
} from "./mappers";
import * as mock from "./mock";
import type { CheckItem, Location, Overview, Period, Plan, RevenueSeries } from "./types";
import { getToken } from "./session";

/** GET with the session token; a missing or expired session goes to /login. */
export async function authed<T>(path: string): Promise<T> {
  const token = getToken();
  if (!token) redirect("/login");
  try {
    return await apiFetch<T>(path, { token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/login?expired=1");
    throw e;
  }
}

export const getSettings = cache(async (): Promise<ApiTenant | null> => {
  if (!isLive()) return null;
  return authed<ApiTenant>("/v1/me");
});

export const getTenant = cache(async () => {
  if (!isLive()) return mock.tenant;
  const [me, locs] = await Promise.all([authed<ApiTenant>("/v1/me"), authed<{ locations: { id: string; name: string }[] }>("/v1/locations")]);
  return toTenant(me, locs.locations[0]?.name ?? "");
});

export const getOverview = cache(async (): Promise<Overview> => {
  if (!isLive()) return mock.overview;
  return toOverview(await authed<Overview>("/v1/dashboard/overview"));
});

type ApiRevenue = {
  series: { labels: [string, string, string]; current: number[]; previous: number[] };
  split: { label: string; share: number; color: string }[];
  top: { name: string; sold: number; revenue: number }[];
};

export const getRevenue = cache(async () => {
  if (!isLive()) return { series: mock.revenue, split: mock.revenueSplit, top: mock.topPackages };
  const get = (p: Period) => authed<ApiRevenue>(`/v1/dashboard/revenue?period=${p}`);
  const [day, week, month] = await Promise.all([get("day"), get("week"), get("month")]);
  const series: Record<Period, RevenueSeries> = { day: toSeries(day), week: toSeries(week), month: toSeries(month) };
  return { series, split: toSplit(month.split), top: month.top };
});

export const getRouters = cache(async () => {
  if (!isLive()) return mock.routers;
  const r = await authed<{ routers: ApiRouter[] }>("/v1/routers");
  return r.routers.map((x) => toRouter(x));
});

export async function getRouter(id: string): Promise<ApiRouter | null> {
  if (!isLive()) return null;
  return authed<ApiRouter>(`/v1/routers/${encodeURIComponent(id)}`);
}

export async function getChecklist(id: string): Promise<CheckItem[]> {
  if (!isLive()) return [];
  const r = await authed<{ items: CheckItem[] }>(`/v1/routers/${encodeURIComponent(id)}/checklist`);
  return r.items;
}

export async function getPayments(status?: string) {
  if (!isLive()) return mock.payments;
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  const r = await authed<{ payments: ApiPayment[] }>(`/v1/payments${q}`);
  return r.payments.map(toPayment);
}

export async function getSubscribers() {
  if (!isLive()) return mock.subscribers;
  const r = await authed<{ subscribers: ApiSubscriber[] }>("/v1/subscribers?limit=500");
  return r.subscribers.map(toSubscriber);
}

export async function getPlans(accessType?: "pppoe" | "hotspot"): Promise<Plan[]> {
  if (!isLive()) {
    return mock.hotspotPackages.map((p) => ({
      id: p.id, name: p.label, accessType: "hotspot", priceKes: p.price, durationDays: null, durationMinutes: p.minutes,
      isTrial: false, dataCapMb: null, downKbps: p.mbps * 1000, upKbps: p.mbps * 1000, maxDevices: 1, isActive: true,
    }));
  }
  const q = accessType ? `?type=${accessType}` : "";
  const r = await authed<{ plans: ApiPlan[] }>(`/v1/plans${q}`);
  return r.plans.map(toPlan);
}

export const getLocations = cache(async (): Promise<Location[]> => {
  if (!isLive()) return [{ id: "loc1", name: mock.onboarding.location }];
  const r = await authed<{ locations: { id: string; name: string }[] }>("/v1/locations");
  return r.locations.map(toLocation);
});

export type Voucher = { id: string; code: string; batch: string | null; plan: string; redeemed: boolean; createdAt: string };

export async function getVouchers(): Promise<Voucher[]> {
  if (!isLive()) return [];
  type Row = { id: string; code: string; batch: string | null; plan_name?: string; redeemed_at: string | null; created_at: string };
  const r = await authed<{ vouchers: Row[] }>("/v1/vouchers");
  return r.vouchers.map((v) => ({ id: v.id, code: v.code, batch: v.batch, plan: v.plan_name ?? "", redeemed: v.redeemed_at !== null, createdAt: v.created_at }));
}

export async function getOnboarding() {
  return mock.onboarding;
}
