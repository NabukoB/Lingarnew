import { describe, expect, it } from "vitest";
import { activeHref, bottomNav, sidebarNav } from "./nav";

describe("activeHref", () => {
  it("picks the most specific item", () => {
    expect(activeHref("/", sidebarNav)).toBe("/");
    expect(activeHref("/packages", sidebarNav)).toBe("/packages");
    expect(activeHref("/packages/hotspot", sidebarNav)).toBe("/packages/hotspot");
    expect(activeHref("/settings/sms", sidebarNav)).toBe("/settings/sms");
    expect(activeHref("/settings/billing", sidebarNav)).toBe("/settings");
    expect(activeHref("/customers", sidebarNav)).toBe("/customers");
  });
  it("maps router pages to the network tab", () => {
    expect(activeHref("/routers/new", bottomNav)).toBe("/network");
    expect(activeHref("/routers/abc", sidebarNav)).toBe("/network");
  });
  it("returns null for unknown paths", () => {
    expect(activeHref("/nope", bottomNav)).toBeNull();
  });
});
