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
```

## Launch checklist — what only you can provide

| Item | Where it goes |
|---|---|
| Domain + a Linux server with a public IP | DNS + `docs/DEPLOYMENT.md` |
| Safaricom Daraja **production** app: consumer key/secret, passkey, your shortcode | `MPESA_PLATFORM_*` |
| Safaricom's **written approval** for platform-mode STK on WISPs' shortcodes (until then, WISPs use "My own" Daraja app) | `SAFARICOM_PLATFORM_APPROVED=yes` |
| Safaricom callback IP list | `MPESA_ALLOWED_IPS` |
| Africa's Talking username, API key, approved sender ID | `AT_USERNAME`, `AT_API_KEY`, `AT_SENDER` |
| AWS KMS key (optional; local KEK works self-hosted) | `KMS_KEY_ID` + AWS credentials |
| A RouterOS v7 router for a first live test | Dashboard → Routers → Add |
