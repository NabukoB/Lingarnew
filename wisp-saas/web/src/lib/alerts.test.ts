import { describe, expect, it } from "vitest";
import { alertsFrom } from "./alerts";
import { overview, tenant } from "./mock";

describe("alertsFrom", () => {
  it("lists only what needs attention", () => {
    expect(alertsFrom({ ...overview, routers: { online: 5, total: 6, offline: 1 }, unmatched: 2, renewalsDue: 0 }, { ...tenant, smsCredits: 0 }).map((a) => a.key)).toEqual([
      "routers",
      "unmatched",
      "sms",
    ]);
    expect(alertsFrom({ ...overview, routers: { online: 1, total: 1, offline: 0 } }, { ...tenant, smsCredits: 50 })).toEqual([]);
    expect(alertsFrom({ ...overview, routers: { online: 2, total: 2, offline: 0, busy: 1 } }, { ...tenant, smsCredits: 50 })).toEqual([
      { key: "busy", text: "1 router at high CPU", href: "/network", tone: "amber" },
    ]);
  });
});
