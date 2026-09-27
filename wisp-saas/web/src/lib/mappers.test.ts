import { describe, expect, it } from "vitest";
import {
  durationLabel,
  initials,
  maskedPhone,
  prettyPhone,
  routerStatus,
  speedLabel,
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
