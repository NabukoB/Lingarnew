import { describe, expect, it } from "vitest";
import { ago, auditText, standingTone } from "./admin-types";

describe("admin helpers", () => {
  const now = Date.parse("2026-10-22T12:00:00Z");
  it("formats relative times", () => {
    expect(ago(null, now)).toBe("never");
    expect(ago("2026-10-22T11:59:40Z", now)).toBe("just now");
    expect(ago("2026-10-22T11:48:00Z", now)).toBe("12 min ago");
    expect(ago("2026-10-22T07:00:00Z", now)).toBe("5 h ago");
    expect(ago("2026-10-19T12:00:00Z", now)).toBe("3 d ago");
    expect(ago("2026-10-25T12:00:00Z", now)).toBe("in 3 d");
  });
  it("describes audit entries", () => {
    const base = { id: "a", tenant_id: null, created_at: "", admin_email: "", tenant_name: null };
    expect(auditText({ ...base, action: "EXTEND_TRIAL", payload: { days: 7 } })).toBe("Trial +7 days");
    expect(auditText({ ...base, action: "ADD_SUBSCRIPTION", payload: { months: 1 } })).toBe("Subscription +1 month");
    expect(auditText({ ...base, action: "GRANT_SMS_CREDITS", payload: { credits: 50 } })).toBe("+50 SMS credits");
    expect(auditText({ ...base, action: "SOMETHING_NEW", payload: {} })).toBe("something new");
  });
  it("maps standing to a tone", () => {
    expect(standingTone("paying")).toBe("success");
    expect(standingTone("trial")).toBe("default");
    expect(standingTone("expired")).toBe("danger");
  });
});
