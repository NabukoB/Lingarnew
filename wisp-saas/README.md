# Mtandao — WiFi billing for small ISPs (WISPs)

Paste one command into a MikroTik (RouterOS v7). We set up PPPoE + Hotspot, bill customers
with M-Pesa, and cut off / reconnect them automatically.

- `cmd/api` — dashboard + portal API, M-Pesa callbacks, router onboarding; `--role=worker` for jobs
- `cmd/radius` + `infra/freeradius` — RADIUS (FreeRADIUS → rlm_rest → Go)
- `cmd/wg-gateway` — WireGuard reverse tunnel to every router
- `web/` — Next.js dashboard (app host) and captive portal (portal host)

Spec: `../CLAUDE.md`. Docs: `docs/`.

## Run it locally

```sh
cp .env.example .env && echo "LOCAL_KEK=$(openssl rand -base64 32)" >> .env && echo RADIUS_SECRET_SEED=dev >> .env
docker compose up --build
# http://localhost:3010/signup
```
Without Docker: Postgres 16 + `go run ./cmd/api` + `cd web && API_URL=http://localhost:8080 npm run dev`.
`web` without `API_URL` shows example data (UI work only).

## Tests

```sh
make lint test      # Go unit + testcontainers integration tests, web type-check/lint/vitest
make e2e-radius     # real FreeRADIUS + radclient against the backend
make e2e            # Playwright: a WISP's first day against a running stack
make perf           # API + RADIUS load budgets on a large seeded ISP
make verify         # all of it end to end, with a report in reports/verify-<time>/
```

`make verify` (`scripts/verify.sh`) runs lint, Go unit + integration tests, web unit tests, the
load budgets, real FreeRADIUS, a production web build with bundle budgets, then starts Postgres + API
+ web and drives every Playwright spec against it (admin console and Core Web Vitals included).

| Budget | Where | Limit |
|---|---|---|
| Dashboard / admin reads (4 clients) on 60 routers, 8,000 customers, 60k payments | `cmd/api/perf_test.go` | p95 100–250 ms |
| Captive portal (32 clients) | same | p95 60 ms, ≥ 300 req/s |
| RADIUS authorize + accounting (32 routers) | same | p95 100 ms, ≥ 300–400 req/s |
| First-load JS per route, gzipped | `web/scripts/bundle-budget.mjs` | portal + sign-in 190 KB, dashboard 280 KB |
| Cold-load Web Vitals (fast network) | `web/e2e/perf.spec.ts` | TTFB 0.8 s, FCP 1.5 s, LCP 2.5 s, CLS 0.1 |
| Captive portal on Slow 4G with 4× CPU slowdown | same | FCP 3 s, LCP 4 s |

`PERF_BUDGET_SCALE=2` loosens the time budgets on slow machines (CI uses 2× for the API, 1.5× for the browser).

## Launch checklist — what only you can provide

| Item | Where it goes |
|---|---|
| Domain + a Linux server with a public IP | DNS + `docs/DEPLOYMENT.md` |
| Safaricom Daraja **production** app: consumer key/secret, passkey, your shortcode | `MPESA_PLATFORM_*` |
| Safaricom's **written approval** for platform-mode STK on WISPs' shortcodes (until then, WISPs use "My own" Daraja app) | `SAFARICOM_PLATFORM_APPROVED=yes` |
| Safaricom callback IP list | `MPESA_ALLOWED_IPS` |
| Africa's Talking username, API key, approved sender ID | `AT_USERNAME`, `AT_API_KEY`, `AT_SENDER` |
| Anthropic API key for the dashboard assistant (optional; without it the Ask panel is off) | `ANTHROPIC_API_KEY`, `ASSISTANT_DAILY_LIMIT` |
| A staff account for the admin console (`/admin`) | `ADMIN_DB_PASSWORD`, `ADMIN_DATABASE_URL`, then `api -role add-admin` (`docs/DEPLOYMENT.md` step 6) |
| AWS KMS key (optional; local KEK works self-hosted) | `KMS_KEY_ID` + AWS credentials |
| A RouterOS v7 router for a first live test | Dashboard → Routers → Add |
