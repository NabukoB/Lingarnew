import { expect, test, type Browser, type BrowserContextOptions, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { signUp, watchErrors } from "./helpers";

// Core Web Vitals and JavaScript weight for a cold first visit (empty cache),
// one fresh browser context per page. The captive portal is measured again on a
// throttled phone connection: that is how most of its users meet it.
//
// PERF_BUDGET_SCALE loosens the time budgets (slow CI runners).
// PERF_REPORT=dir writes web-perf.json and web-perf.md there.

const scale = Number(process.env.PERF_BUDGET_SCALE) > 0 ? Number(process.env.PERF_BUDGET_SCALE) : 1;

type Budget = { ttfb: number; fcp: number; lcp: number; cls: number; jsKB: number };
type Vitals = { ttfb: number; fcp: number; lcp: number; cls: number; jsKB: number; requests: number };
type Row = { page: string; network: string; vitals: Vitals; budget: Budget; pass: boolean };

// "Good" Core Web Vitals thresholds (LCP 2.5 s, CLS 0.1) on a fast network;
// first-load JS stays under 300 KB compressed on every page.
const desktop: Budget = { ttfb: 800, fcp: 1500, lcp: 2500, cls: 0.1, jsKB: 300 };
// Slow 4G as Chrome defines it: 150 ms RTT, 1.6 Mbps down, 750 kbps up.
const slow4g = { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 };
const phone: Budget = { ttfb: 1500, fcp: 3000, lcp: 4000, cls: 0.1, jsKB: 300 };

const rows: Row[] = [];

async function measure(
  browser: Browser,
  name: string,
  path: string,
  budget: Budget,
  opts: BrowserContextOptions & { throttle?: boolean; ready?: (p: Page) => Promise<void> } = {},
) {
  const { throttle, ready, ...ctxOpts } = opts;
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  if (throttle) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", slow4g);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  // Start observers before any page script runs so nothing is missed.
  await page.addInitScript(() => {
    const w = window as unknown as { __lcp: number; __cls: number };
    w.__lcp = 0;
    w.__cls = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) w.__lcp = Math.max(w.__lcp, e.startTime);
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!e.hadRecentInput) w.__cls += e.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(path, { waitUntil: "load" });
  if (ready) await ready(page);
  // On a throttled phone the first paint can land after "load"; wait for it rather than reading 0.
  await page.waitForFunction(() => performance.getEntriesByName("first-contentful-paint").length > 0, null, { timeout: 30_000 });
  await page.waitForTimeout(500); // let late layout shifts and LCP candidates land
  // LCP is final once the user interacts; a click on empty space ends it like a real tap would.
  await page.mouse.click(1, 1);
  const v = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0;
    const scripts = (performance.getEntriesByType("resource") as PerformanceResourceTiming[]).filter((r) => r.initiatorType === "script");
    const w = window as unknown as { __lcp: number; __cls: number };
    return {
      ttfb: Math.round(nav.responseStart),
      fcp: Math.round(fcp),
      lcp: Math.round(w.__lcp || fcp),
      cls: Math.round(w.__cls * 1000) / 1000,
      jsKB: Math.round(scripts.reduce((n, r) => n + r.transferSize, 0) / 1024),
      requests: scripts.length,
    };
  });
  await ctx.close();
  const scaled = { ...budget, ttfb: budget.ttfb * scale, fcp: budget.fcp * scale, lcp: budget.lcp * scale };
  const pass = v.fcp > 0 && v.lcp > 0 && v.ttfb <= scaled.ttfb && v.fcp <= scaled.fcp && v.lcp <= scaled.lcp && v.cls <= scaled.cls && v.jsKB <= scaled.jsKB;
  rows.push({ page: name, network: throttle ? "Slow 4G, 4× CPU" : "fast", vitals: v, budget: scaled, pass });
  expect(errors, `${name}: console errors`).toEqual([]);
  expect(v.fcp, `${name}: no first paint recorded`).toBeGreaterThan(0);
  expect.soft(v.cls, `${name}: CLS`).toBeLessThanOrEqual(scaled.cls);
  expect.soft(v.lcp, `${name}: LCP ms`).toBeLessThanOrEqual(scaled.lcp);
  expect.soft(v.fcp, `${name}: FCP ms`).toBeLessThanOrEqual(scaled.fcp);
  expect.soft(v.ttfb, `${name}: TTFB ms`).toBeLessThanOrEqual(scaled.ttfb);
  expect.soft(v.jsKB, `${name}: JS KB`).toBeLessThanOrEqual(scaled.jsKB);
}

test.describe("web performance", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(180_000);

  test("cold loads stay inside Core Web Vitals budgets", async ({ browser }) => {
    // One ISP with its default packages; its signed-in cookie is reused for the dashboard pages.
    const ownerCtx = await browser.newContext();
    const owner = await ownerCtx.newPage();
    const { slug } = await signUp(owner, "Perf");
    const storageState = await ownerCtx.storageState();
    await ownerCtx.close();

    const signedIn = { storageState, viewport: { width: 1280, height: 900 } };
    const iphone = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 };
    const portal = `/portal?t=${slug}&mac=AA:BB:CC:DD:EE:61`;
    const portalReady = async (p: Page) => {
      await expect(p.getByRole("tab", { name: "Buy" })).toBeVisible();
    };

    await measure(browser, "Login", "/login", desktop);
    await measure(browser, "Sign up", "/signup", desktop);
    await measure(browser, "Home", "/", desktop, signedIn);
    await measure(browser, "Customers", "/customers", desktop, signedIn);
    await measure(browser, "Routers", "/network", desktop, signedIn);
    await measure(browser, "Money", "/money", desktop, signedIn);
    await measure(browser, "Packages", "/packages", desktop, signedIn);
    await measure(browser, "Home (phone)", "/", desktop, { ...signedIn, ...iphone });
    await measure(browser, "Admin sign-in", "/admin/login", desktop);
    await measure(browser, "Captive portal", portal, desktop, { ...iphone, ready: portalReady });
    await measure(browser, "Captive portal", portal, phone, { ...iphone, throttle: true, ready: portalReady });
  });

  test.afterAll(() => {
    const md = [
      "| Page | Network | TTFB ms | FCP ms | LCP ms | CLS | JS KB (requests) | Result |",
      "|---|---|--:|--:|--:|--:|--:|---|",
      ...rows.map(
        (r) =>
          `| ${r.page} | ${r.network} | ${r.vitals.ttfb} | ${r.vitals.fcp} | ${r.vitals.lcp} | ${r.vitals.cls} | ${r.vitals.jsKB} (${r.vitals.requests}) | ${r.pass ? "pass" : "**FAIL**"} |`,
      ),
      "",
      `Budgets (fast / Slow 4G): TTFB ${desktop.ttfb * scale}/${phone.ttfb * scale} ms, FCP ${desktop.fcp * scale}/${phone.fcp * scale} ms, ` +
        `LCP ${desktop.lcp * scale}/${phone.lcp * scale} ms, CLS ${desktop.cls}, JS ${desktop.jsKB} KB. Cold cache, production build.`,
    ].join("\n");
    console.log("\n" + md);
    const dir = process.env.PERF_REPORT;
    if (dir) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "web-perf.json"), JSON.stringify(rows, null, 2));
      writeFileSync(join(dir, "web-perf.md"), "## Web pages\n\n" + md + "\n");
    }
  });
});
