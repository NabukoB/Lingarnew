import { expect, test } from "@playwright/test";
import { signUp, watchErrors } from "./helpers";

// One WISP's first day: sign up, add a customer, make vouchers, add a router,
// then a hotspot customer redeems a voucher on the captive portal.
test("WISP first day, end to end", async ({ page, context }) => {
  const errors = watchErrors(page);
  const { slug, business } = await signUp(page, "Smoke");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: business })).toBeVisible();

  // Customer
  await page.goto("/customers");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const add = page.getByRole("dialog", { name: "Add customer" });
  await add.getByLabel("Name").fill("Mary Wanjiku");
  await add.getByLabel("Phone").fill("0712000111");
  await add.getByRole("button", { name: "Add customer" }).click();
  await expect(page.getByRole("dialog", { name: "Customer added" })).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("button", { name: /Mary Wanjiku/ }).first()).toBeVisible();

  // Packages exist from signup
  await page.goto("/packages");
  await expect(page.getByText("Bronze 5 Mbps")).toBeVisible();

  // Vouchers
  await page.goto("/vouchers");
  await page.getByRole("button", { name: "New batch" }).first().click();
  await page.getByLabel("How many").fill("3");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("[data-code]")).toHaveCount(3);
  const code = (await page.locator("[data-code]").first().textContent())!.trim();
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);

  // Router
  await page.goto("/routers/new");
  await page.getByLabel("Name", { exact: true }).fill("Smoke Mast");
  await page.getByRole("button", { name: "Get command" }).click();
  await expect(page.locator("pre").first()).toContainText("/tool fetch url=");

  // Captive portal, as the router's login page sends a phone there.
  const portal = await context.newPage();
  const portalErrors = watchErrors(portal);
  const mac = "AA:BB:CC:DD:EE:10";
  await portal.goto(`/portal?t=${slug}&mac=${encodeURIComponent(mac)}&link=${encodeURIComponent("http://172.20.0.1/login")}`);
  await expect(portal.getByText(business)).toBeVisible();
  await expect(portal.getByText("1 day")).toBeVisible();

  let hotspotLogin = "";
  await portal.route("http://172.20.0.1/**", (route) => {
    hotspotLogin = route.request().url();
    return route.fulfill({ status: 200, body: "logged in" });
  });
  await portal.getByRole("tab", { name: "Voucher" }).click();
  await portal.locator("input[autocomplete='one-time-code']").fill(code);
  await portal.getByRole("button", { name: "Connect" }).click();
  await expect.poll(() => hotspotLogin).toContain("username=AA%3ABB%3ACC%3ADD%3AEE%3A10");
  await portal.waitForURL(/^http:\/\/172\.20\.0\.1\/login/);
  const dst = new URL(hotspotLogin).searchParams.get("dst")!;
  expect(dst).toContain("/portal/online?p=");

  // The router bounces the device back to the online page.
  await portal.goto(dst);
  await expect(portal.getByText("You're online")).toBeVisible();

  // Same voucher twice is refused.
  await portal.goto(`/portal/voucher`);
  await portal.locator("input[autocomplete='one-time-code']").fill(code);
  await portal.getByRole("button", { name: "Connect" }).click();
  await expect(portal.getByRole("alert").filter({ hasText: /used|already/i })).toBeVisible();

  expect(errors).toEqual([]);
  expect(portalErrors).toEqual([]);
});
