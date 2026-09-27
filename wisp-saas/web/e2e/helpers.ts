import { expect, type Page } from "@playwright/test";

/** Creates a fresh WISP account and returns its portal slug and name. */
export async function signUp(page: Page, label = "Nav"): Promise<{ slug: string; business: string }> {
  const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const business = `${label} ${stamp} WiFi`;
  await page.goto("/signup");
  await page.getByLabel("Business name").fill(business);
  await page.getByLabel("Email").fill(`owner-${stamp}@example.com`);
  await page.getByLabel("Password").fill("correct-horse-1");
  await page.getByLabel("Support phone").fill("0712345678");
  await page.getByRole("tab", { name: "Paybill" }).click();
  await page.getByLabel("Till or Paybill number").fill("174379");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/settings\?welcome=1/);
  const href = await page.getByRole("link", { name: "Preview portal" }).getAttribute("href");
  return { slug: href!.split("t=")[1]!, business };
}

/**
 * Collects console errors and uncaught exceptions. Google Fonts are stubbed:
 * test sandboxes often can't reach them, and they aren't the app's code.
 */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  void page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/fonts\.(googleapis|gstatic)\.com|Failed to load resource: net::ERR_(TUNNEL|PROXY|NAME|CONNECTION)/.test(t)) return;
    // Next logs this when a hard page.goto aborts a background route prefetch; users never see it.
    if (/^Failed to fetch RSC payload for .* Falling back to browser navigation/.test(t)) return;
    errors.push("console: " + t);
  });
  return errors;
}
