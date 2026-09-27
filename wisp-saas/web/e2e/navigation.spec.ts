import { expect, test } from "@playwright/test";
import { signUp, watchErrors } from "./helpers";

const pages = [
  { nav: "Customers", url: /\/customers$/, heading: "Customers" },
  { nav: "Routers", url: /\/network$/, heading: "Network" },
  { nav: "Packages", url: /\/packages$/, heading: "Packages" },
  { nav: "Hotspot", url: /\/packages\/hotspot$/, heading: "Packages" },
  { nav: "Money", url: /\/money$/, heading: "Money" },
  { nav: "Vouchers", url: /\/vouchers$/, heading: "Vouchers" },
  { nav: "SMS", url: /\/settings\/sms$/, heading: "Settings" },
  { nav: "Settings", url: /\/settings$/, heading: "Settings" },
  { nav: "Home", url: /\/$/, heading: null },
];

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("every sidebar link loads fast, highlights, and logs no errors", async ({ page }) => {
    const errors = watchErrors(page);
    const { business } = await signUp(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: business })).toBeVisible();

    const timings: Record<string, number> = {};
    const sidebar = page.getByRole("navigation", { name: "Main" });
    for (const p of pages) {
      const link = sidebar.getByRole("link", { name: p.nav });
      await link.hover(); // intent: prefetches the page's data
      await page.waitForTimeout(150);
      const t0 = Date.now();
      await link.click();
      await expect(page).toHaveURL(p.url);
      if (p.heading) await expect(page.getByRole("heading", { level: 1, name: p.heading })).toBeVisible();
      else await expect(page.getByRole("heading", { name: business })).toBeVisible();
      timings[p.nav] = Date.now() - t0;
      await expect(sidebar.getByRole("link", { name: p.nav })).toHaveAttribute("aria-current", "page");
    }
    console.log("navigation ms", JSON.stringify(timings));
    for (const [name, ms] of Object.entries(timings)) expect(ms, `${name} took ${ms}ms`).toBeLessThan(2500);

    // Back / forward keep working with page transitions.
    await page.goBack();
    await expect(page).toHaveURL(/\/settings$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/$/);
    expect(errors).toEqual([]);
  });

  test("⌘K palette jumps to pages and actions", async ({ page }) => {
    const errors = watchErrors(page);
    await signUp(page, "Palette");
    await page.goto("/");
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "Search" });
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder(/Search customers/).fill("vouch");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/vouchers/);
    await expect(page.getByRole("dialog", { name: "New batch" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "New batch" })).toBeHidden();

    // Search pill in the top bar opens it too, and finds customers by name.
    await page.goto("/customers?new=1");
    const add = page.getByRole("dialog", { name: "Add customer" });
    await add.getByLabel("Name").fill("Peter Otieno");
    await add.getByLabel("Phone").fill("0722118430");
    await add.getByRole("button", { name: "Add customer" }).click();
    await page.getByRole("button", { name: "Done" }).click();
    await page.goto("/");
    await page.getByRole("button", { name: /^Search/ }).click();
    await page.getByPlaceholder(/Search customers/).fill("Peter");
    await page.getByRole("option", { name: /Peter Otieno/ }).click();
    await expect(page).toHaveURL(/\/customers\?c=/);
    await expect(page.getByRole("complementary", { name: "Selected customer" })).toContainText("Peter Otieno");
    expect(errors).toEqual([]);
  });

  test("dialogs, selects and toasts work", async ({ page }) => {
    const errors = watchErrors(page);
    await signUp(page, "Dialogs");
    await page.goto("/packages/hotspot");
    await page.getByRole("button", { name: "New" }).click();
    const d = page.getByRole("dialog", { name: "New package" });
    await d.getByLabel("Name").fill("2 hrs");
    await d.getByLabel("Price (KSh)").fill("25");
    await d.getByRole("combobox", { name: "Time" }).click();
    await page.getByRole("option", { name: "3 hrs" }).click();
    await d.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Package created")).toBeVisible();
    await expect(page.getByRole("button", { name: /2 hrs/ })).toBeVisible();

    // Settings: switch + save + toast
    await page.goto("/settings/sms");
    await page.getByRole("switch", { name: "Hotspot expiry SMS" }).click();
    await expect(page.getByRole("textbox", { name: "Expiry SMS" })).toBeVisible();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("switch", { name: "Hotspot expiry SMS" })).toHaveAttribute("aria-checked", "true");
    expect(errors).toEqual([]);
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("bottom tabs navigate and the customer sheet opens", async ({ page }) => {
    const errors = watchErrors(page);
    const { business } = await signUp(page, "Phone");
    await page.goto("/");
    await expect(page.getByRole("heading", { name: business })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
    const tabs = page.getByRole("navigation", { name: "App sections" });
    for (const [name, url] of [
      ["Money", /\/money$/],
      ["Network", /\/network$/],
      ["Customers", /\/customers$/],
      ["Home", /\/$/],
    ] as const) {
      await tabs.getByRole("link", { name }).click();
      await expect(page).toHaveURL(url);
      await expect(tabs.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
    }

    await page.goto("/customers?new=1");
    await page.getByLabel("Name").fill("Grace Achieng");
    await page.getByLabel("Phone").fill("0701992015");
    await page.getByRole("button", { name: "Add customer" }).click();
    await page.getByRole("button", { name: "Done" }).click();
    await page.getByRole("button", { name: /Grace Achieng/ }).click();
    const sheet = page.getByRole("dialog", { name: "Grace Achieng" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Send STK push" })).toBeVisible();

    // No horizontal page scroll on a phone.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });

  test("captive portal tabs and package picker", async ({ page, browser }) => {
    const owner = await browser.newPage();
    const { slug } = await signUp(owner, "Portal");
    await owner.close();
    const errors = watchErrors(page);
    await page.goto(`/portal?t=${slug}&mac=AA:BB:CC:DD:EE:31`);
    await page.getByText("3 hrs").click();
    await expect(page.getByRole("button", { name: /Pay KSh 30/ })).toBeVisible();
    await page.getByRole("button", { name: /Pay KSh 30/ }).click();
    await expect(page.locator("#phone-error")).toContainText("Safaricom number");
    for (const [tab, url] of [
      ["Voucher", /\/portal\/voucher$/],
      ["Reconnect", /\/portal\/reconnect$/],
      ["Trial", /\/portal\/trial$/],
      ["Buy", /\/portal$/],
    ] as const) {
      await page.getByRole("tab", { name: tab }).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByRole("tab", { name: tab })).toHaveAttribute("aria-selected", "true");
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
});

test("reduced motion still shows everything", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const { business } = await signUp(page, "Calm");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: business })).toBeVisible();
  await expect(page.getByLabel("M-Pesa today")).toContainText("KSh 0");
  await expect(page.getByRole("link", { name: /Online: 0/ })).toBeVisible();
  await ctx.close();
});
