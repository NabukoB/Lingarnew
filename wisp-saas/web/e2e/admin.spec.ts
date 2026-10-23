import { expect, test, type Page } from "@playwright/test";
import { signUp, watchErrors } from "./helpers";
import { totp } from "./totp";

// Needs a staff account: `api -role add-admin -email … ` and its secret in
// E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD / E2E_ADMIN_SECRET (CI creates one).
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;
const secret = process.env.E2E_ADMIN_SECRET;

async function adminSignIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  // A code works once; if this step's code was used by an earlier run, the next step's is accepted too.
  for (const at of [Date.now(), Date.now() + 30_000]) {
    await page.getByLabel("Authenticator code").fill(totp(secret!, at));
    await page.getByRole("button", { name: "Sign in" }).click();
    const ok = await page.waitForURL(/\/admin$/, { timeout: 4000 }).then(() => true, () => false);
    if (ok) return;
  }
  throw new Error("admin sign-in failed");
}

test.describe("admin console", () => {
  test.skip(!email || !password || !secret, "set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and E2E_ADMIN_SECRET");

  test("staff sign in with a code, find an ISP and grant SMS credits", async ({ browser }) => {
    // An ISP signs up first (in its own browser context).
    const owner = await browser.newPage();
    const { business } = await signUp(owner, "Console");
    await owner.close();

    const page = await browser.newPage();
    const errors = watchErrors(page);

    // Wrong code is refused with one generic message.
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByLabel("Authenticator code").fill("000000");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Email, password or code is wrong." })).toBeVisible();

    await adminSignIn(page);
    await expect(page.getByText("Our income · 30 days")).toBeVisible();
    await expect(page.getByText("Needs attention")).toBeVisible();

    await page.getByRole("tab", { name: "ISPs" }).click();
    await page.getByLabel("Search ISPs").fill(business);
    await page.keyboard.press("Enter");
    await page.getByRole("link", { name: new RegExp(business) }).click();
    await expect(page.getByRole("heading", { name: business })).toBeVisible();
    await expect(page.getByText("Trial", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "SMS credits" }).click();
    const d = page.getByRole("dialog", { name: "Grant SMS credits" });
    await d.getByLabel("Credits").fill("50");
    await d.getByRole("button", { name: "Grant SMS credits" }).click();
    await expect(d.getByRole("alert")).toContainText("Add a reason.");
    await d.getByLabel("Reason").fill("E2E goodwill");
    await d.getByRole("button", { name: "Grant SMS credits" }).click();
    await expect(page.getByText("+50 credits")).toBeVisible();
    await expect(page.getByText("“E2E goodwill”")).toBeVisible();

    await page.getByRole("tab", { name: "Audit" }).click();
    await expect(page.getByText("+50 SMS credits").first()).toBeVisible();

    // The admin cookie is scoped to /admin: the ISP dashboard doesn't treat staff as signed in.
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/admin");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin/tenants");
    await expect(page).toHaveURL(/\/admin\/login/);
    expect(errors).toEqual([]);
  });
});
