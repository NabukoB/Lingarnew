import { describe, expect, it } from "vitest";
import {
  durationLabel,
  initials,
  maskedPhone,
  prettyPhone,
  routerStatus,
  speedLabel,
  toMap,
  toMetricSeries,
  toPayment,
  toRouter,
  toSubscriber,
  toTenant,
  type ApiTenant,
} from "./mappers";

describe("mappers", () => {
  it("formats phones and initials", () => {
    expect(prettyPhone("254712345678")).toBe("0712 345 678");
    expect(maskedPhone("254712345678")).toBe("0712 ••• 678");
    expect(prettyPhone(null)).toBe("");
    expect(initials("Jazmoge WiFi")).toBe("JW");
    expect(initials("Mtandao")).toBe("MT");
  });

  it("maps a tenant", () => {
    const t = toTenant(
      {
        name: "Jazmoge WiFi",
        slug: "jazmoge",
        account_prefix: "JZM",
        support_phone: "254712345678",
        mpesa_shortcode_type: "paybill",
        mpesa_shortcode: "174379",
        primary_color: "#2563eb",
        subscription_status: "trial",
        trial_days_left: 9,
        sms_credits: 4,
      } as ApiTenant,
      "Kasarani",
    );
    expect(t).toMatchObject({ initials: "JW", supportPhone: "0712 345 678", shortcode: "174379", trialDaysLeft: 9, location: "Kasarani" });
  });

  it("maps router states", () => {
    expect(routerStatus("degraded")).toBe("slow");
    expect(routerStatus("pending")).toBe("pending");
    expect(routerStatus("misconfigured")).toBe("slow");
    const now = Date.parse("2026-09-25T10:30:00Z");
    const r = toRouter(
      { id: "r", name: "Ruiru", location_name: "Ruiru", status: "offline", connected: true, active_sessions: 0, status_changed_at: "2026-09-25T10:12:00Z" } as never,
      now,
    );
    expect(r).toMatchObject({ status: "offline", offlineMinutes: 18, users: 0 });
    const live = { cpu_load: 95, mem_used_pct: 40, pppoe_users: 30, hotspot_users: 7, rx_bps: 1e6, tx_bps: 1e5, high_cpu: true };
    expect(toRouter({ id: "r", name: "M", status: "online", connected: true, active_sessions: 3, status_changed_at: "2026-09-25T10:12:00Z", live } as never)).toMatchObject({
      users: 37,
      cpu: 95,
      highCpu: true,
    });
  });

  it("maps metric series and the network map", () => {
    const s = toMetricSeries({ range: "7d", step_sec: 3600, points: [{ at: "t", cpu_load: 5, mem_used_pct: 40, pppoe_users: 3, hotspot_users: 1, rx_bps: 10, tx_bps: 2 }] });
    expect(s).toEqual({ range: "7d", stepSec: 3600, points: [{ at: "t", cpu: 5, mem: 40, pppoe: 3, hotspot: 1, rxBps: 10, txBps: 2 }] });
    const m = toMap([
      {
        id: "s",
        name: "Kasarani",
        routers: [
          {
            id: "r",
            name: "POP",
            status: "degraded",
            board: "hAP",
            live: null,
            neighbors: [{ interface: "ether2", mac: "AA", identity: "Beta", address: "10.0.0.2", platform: "MikroTik", board: "RB", router_id: "r2" }],
          },
        ],
      },
    ]);
    expect(m[0]!.routers[0]).toMatchObject({ status: "slow", users: null, cpu: null, neighbors: [{ identity: "Beta", routerId: "r2" }] });
  });

  it("maps payments", () => {
    const base = { id: "1", status: "success", amount_kes: 60, receipt: "RKT1", phone: "254712345678", name: null, at: "2026-09-25T11:32:00Z" };
    expect(toPayment({ ...base, kind: "hotspot", account_id: null, plan: "1 day", reference: "HS1" })).toMatchObject({ who: "Hotspot · 1 day", detail: "0712 ••• 678", time: "14:32" });
    expect(toPayment({ ...base, kind: "pppoe", account_id: "JZM1042", plan: "Bronze", reference: "JZM1042" })).toMatchObject({ who: "JZM1042", detail: "Bronze" });
    expect(toPayment({ ...base, kind: "unmatched", account_id: null, plan: null, reference: "JOHN" })).toMatchObject({ who: "Account “JOHN”", detail: "Match" });
  });

  it("maps subscribers", () => {
    const s = toSubscriber({
      id: "u1",
      account_id: "JZM1042",
      full_name: "Mary Wanjiku",
      phone: "254712345678",
      phone_pretty: "0712 345 678",
      status: "expired",
      plan_id: "p1",
      plan_name: "Bronze 5 Mbps",
      plan_price_kes: 1500,
      next_renewal_at: "2026-10-24T09:00:00Z",
    });
    expect(s).toMatchObject({ id: "JZM1042", key: "u1", status: "expired", renews: "24 Oct", paidUntil: "24 Oct 2026", price: 1500 });
  });

  it("labels durations and speeds", () => {
    expect(durationLabel(30)).toBe("30 min");
    expect(durationLabel(180)).toBe("3 hrs");
    expect(durationLabel(1440)).toBe("1 day");
    expect(durationLabel(10080)).toBe("1 week");
    expect(speedLabel(5000)).toBe("5 Mbps");
    expect(speedLabel(512)).toBe("512 kbps");
  });
});
