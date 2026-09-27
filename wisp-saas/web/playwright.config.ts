import { defineConfig, devices } from "@playwright/test";

// End-to-end smoke test against a running stack:
//   Go API (cmd/api) + Postgres, and this app started with API_URL set.
//   BASE_URL=http://localhost:3010 npx playwright test
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3010",
    trace: "retain-on-failure",
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
});
