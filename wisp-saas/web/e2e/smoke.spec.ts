import { expect, test } from "@playwright/test";

// One WISP's first day: sign up, add a customer, make vouchers, add a router,
// then a hotspot customer redeems a voucher on the captive portal.
test("WISP first day, end to end", async ({ page, context }) => {
  const stamp = Date.now().toString(36);
  const business = `Smoke ${stamp} WiFi`;

  await page.goto("/signup");
  await page.getByLabel("Business name").fill(business);
  await page.getByLabel("Email").fill(`owner-${stamp}@example.com`);
  await page.getByLabel("Password").fill("correct-horse-1");
  await page.getByLabel("Support phone").fill("0712345678");
  await page.getByRole("button", { name: "Paybill" }).click();
  await page.getByPlaceholder("Number").fill("174379");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/settings\?welcome=1/);
  const slug = (await page.getByRole("link", { name: "Preview portal" }).getAttribute("href"))!.split("t=")[1]!;

  await page.goto("/");
  await expect(page.getByRole("heading", { name: business })).toBeVisible();

  // Customer
  await page.goto("/customers");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByLabel("Name").fill("Mary Wanjiku");
  await page.getByLabel("Phone").fill("0712000111");
  await page.getByRole("button", { name: "Add customer" }).click();
  await expect(page.getByRole("dialog", { name: "Customer added" })).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("Mary Wanjiku").first()).toBeVisible();

  // Packages exist from signup
  await page.goto("/packages");
  await expect(page.getByText("Bronze 5 Mbps")).toBeVisible();

  // Vouchers
  await page.goto("/vouchers");
  await page.getByRole("button", { name: "New batch" }).click();
  await page.getByLabel("How many").fill("3");
  await page.getByRole("button", { name: "Create" }).click();
  const code = (await page.locator("section[aria-label='Voucher codes'] .font-mono").first().textContent())!.trim();
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);

  // Router
  await page.goto("/routers/new");
  await page.getByLabel("Name", { exact: true }).fill("Smoke Mast");
  await page.getByRole("button", { name: "Get command" }).click();
  await expect(page.locator("pre").first()).toContainText("/tool fetch url=");

  // Captive portal, as the router's login page sends a phone there.
  const portal = await context.newPage();
  const mac = "AA:BB:CC:DD:EE:10";
  await portal.goto(`/portal?t=${slug}&mac=${encodeURIComponent(mac)}&link=${encodeURIComponent("http://172.20.0.1/login")}`);
  await expect(portal.getByText(business)).toBeVisible();
  await expect(portal.getByText("1 day")).toBeVisible();

  let hotspotLogin = "";
  await portal.route("http://172.20.0.1/**", (route) => {
    hotspotLogin = route.request().url();
    return route.fulfill({ status: 200, body: "logged in" });
  });
  await portal.getByRole("link", { name: "Voucher" }).click();
  await portal.locator("input[autocomplete='one-time-code']").fill(code);
  await portal.getByRole("button", { name: "Connect" }).click();
  await expect.poll(() => hotspotLogin).toContain("username=AA%3ABB%3ACC%3ADD%3AEE%3A10");
  const dst = new URL(hotspotLogin).searchParams.get("dst")!;
  expect(dst).toContain("/portal/online?p=");

  // The router bounces the device back to the online page.
  await portal.goto(dst);
  await expect(portal.getByText("You're online")).toBeVisible();

  // Same voucher twice is refused.
  await portal.goto(`/portal/voucher`);
  await portal.locator("input[autocomplete='one-time-code']").fill(code);
  await portal.getByRole("button", { name: "Connect" }).click();
  await expect(portal.getByRole("alert")).toBeVisible();
});
