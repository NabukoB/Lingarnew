# Architecture

Three Go binaries from one module, one Next.js app, Postgres. See CLAUDE.md §3.1.

```
                    ┌──────────── Internet ─────────────┐
 Safaricom Daraja ──┤ HTTPS callbacks                    │
 WISP (browser)  ───┤ app.<domain>  ──┐                  │
 Hotspot phone   ───┤ portal.<domain> ├─► web (Next.js) ─┼─► api
                    │ api.<domain> ───┴──────────────────┼─► api (cmd/api)
 MikroTik router ───┤ UDP 51820 (router dials out) ──────┼─► wg-gateway (wg0 10.200.0.1/16)
                    └────────────────────────────────────┘
   inside the gateway's network namespace:
     api ── REST https://10.200.x.x/rest/... ─────────► router (Basic auth)
     api/radius ── RADIUS Disconnect UDP 3799 ────────► router
     router ── RADIUS UDP 1812/1813 → 10.200.0.1 ────► FreeRADIUS ─rlm_rest─► radius (cmd/radius)
   all of api, worker, radius ──────────────────────► Postgres (RLS, role wisp_api)
```

## Processes

| Process | Code | Does |
|---|---|---|
| `api --role=api` | `cmd/api` | Dashboard API, captive-portal API, M-Pesa callbacks, router onboarding (`/onboard/{token}`). Applies migrations on start when `MIGRATE_DATABASE_URL` is set. |
| `api --role=worker` | `internal/worker` | STK sweep (30s), router health poll (60s), Hotspot expiry SMS (1 min), renewals + reminders (15 min), housekeeping (1h). |
| `radius` | `cmd/radius`, `internal/session` | rlm_rest backend: dynamic client secrets, authorize, accounting. |
| FreeRADIUS | `infra/freeradius` | Dumb proxy; PAP/CHAP/MS-CHAPv2 use the `Cleartext-Password` the backend returns. |
| `wg-gateway` | `cmd/wg-gateway`, `internal/tunnel` | Userspace WireGuard (wireguard-go). Every 5s it makes wg0's peers match `routers.wg_public_key` / `tunnel_ip`. |
| web | `web/` | Dashboard (app host) and captive portal (portal host or a WISP's own domain). Talks to the API server-side only. |

## Packages (`internal/`)

| Package | CLAUDE.md name | Owns |
|---|---|---|
| `tenant` | tenant-svc | Sign-up (account prefix, starter packages, per-tenant data key), settings, our subscription gate |
| `auth` | — | argon2id passwords, opaque bearer sessions (SHA-256 stored) |
| `customers` | subscriber-svc | Plans, locations, PPPoE subscribers (account IDs, sealed passwords), vouchers |
| `billing` | billing-svc + hotspot | Daraja STK / query / C2B, callbacks, renewals from payments, Hotspot purchase, reconnect, voucher, trial |
| `mpesa` | — | Daraja HTTP client |
| `sms` | — | Africa's Talking, per-part credit charging |
| `router`, `routeros` | router-svc | Onboarding script, health polling, config sync, checklist, REST kick; RouterOS v7 REST client |
| `session` | session-svc | RADIUS authorize/accounting, CoA disconnects |
| `tunnel` | tunnel-orchestrator | WireGuard peer reconciliation |
| `dashboard` | — | Overview + revenue numbers |
| `admin` | — | Platform staff console: password + TOTP sign-in, ISP list, trial/subscription/SMS-credit changes, audit |
| `assistant` | — | Dashboard assistant (Claude) with read-only tools and confirm cards |
| `portal` | — | Public captive-portal HTTP handlers |
| `worker` | — | Background jobs |
| `secrets` | — | Envelope encryption (KMS or local KEK), XChaCha20-Poly1305 |
| `store` | — | sqlc-generated queries (`db/queries/*.sql`) |
| `platform/*` | — | config, db (tenant transactions), httpx errors, migrate, phone, random, ratelimit |

## Multi-tenancy

Every tenant table has RLS on `app_tenant()` = `current_setting('app.current_tenant_id')`.
`db.WithTenant` opens a transaction and sets it with `set_config(..., true)` (transaction-local).
The app role `wisp_api` is a member of `wisp_app` and owns nothing, so RLS always applies.
Lookups that must happen before the tenant is known (login, callbacks by slug, RADIUS by NAS IP,
onboarding token, WireGuard peers) are `SECURITY DEFINER` functions returning the minimum columns.

## Money and time

Integer cents in the DB, whole KES at the Daraja boundary and in the UI. `TIMESTAMPTZ` in UTC,
rendered in the tenant's timezone (default Africa/Nairobi).

## Decisions worth knowing

- **Expired vs suspended.** When a PPPoE period (plus the tenant's grace hours) ends, the worker sets
  `status='expired'` and disconnects. `suspended` is reserved for a WISP's manual suspension, so a
  payment reactivates an expired account automatically but never undoes a manual suspension.
  (CLAUDE.md §10 says "suspended" for both; this split keeps the two cases apart.)
- **RADIUS secrets are derived, not stored**: HKDF-SHA256(`RADIUS_SECRET_SEED`, router id). FreeRADIUS
  learns them through dynamic clients. Never change the seed once routers exist.
- **Router identity = tunnel IP.** WireGuard binds each tunnel IP to one router key, so the RADIUS packet
  source can't be spoofed. The backend never trusts a tenant hint from the request.
- **Hotspot identity = device MAC** (username = password = MAC). The router tries MAC login first
  (`login-by=mac,http-pap`), so a paid device reconnects without the portal.
- **Rate limits** are per client IP. The web app forwards `X-Forwarded-For`; the API trusts only the
  last entry (appended by our proxy), or `CF-Connecting-IP` when `TRUST_CLOUDFLARE=true`.
- **No Redis yet.** Token cache, rate limits and IP allocation are in-process / Postgres
  (`allocate_tunnel_ip` with an advisory lock). Add Redis when the API runs more than one replica.
- **Router history lives in Postgres.** Each 60s poll stores one `router_metrics` row (CPU, memory,
  PPPoE/Hotspot users, uplink counters and the rate derived from the previous poll). Minute rows older
  than two days are folded into hourly averages by the hourly housekeeping job and kept 31 days, so a
  router costs at most ~3,500 rows. Move to Prometheus remote-write only if this table becomes a
  measured bottleneck.
- **Network map = what routers see.** `/ip/neighbor` is read every 10 minutes into `router_neighbors`.
  A neighbour whose RouterOS identity matches one of the tenant's router names is drawn as a link
  between those routers (the setup script sets the identity to the dashboard name).
- **Assistant = read tools + confirm cards.** `internal/assistant` streams Claude (`claude-opus-5-5`,
  medium effort, server-side refusal fallback) with tools that only read the signed-in tenant's data
  through the other packages' services. Anything that changes state comes back as a `proposal` event;
  the dashboard shows a card and, on Confirm, calls the normal API endpoint (router syncs are audited
  as `initiated_by='ai'`). Passwords, M-Pesa secrets and full phone numbers are never in tool
  results. The conversation lives in the browser (text only, ≤ 20 turns); `assistant_usage` counts
  questions and tokens per WISP per day for `ASSISTANT_DAILY_LIMIT`. The key (`ANTHROPIC_API_KEY`)
  is a platform secret like the Daraja app's; without it the panel says it is off.
- **Platform admin = a separate DB role, not an RLS bypass.** Staff use `/admin` on the dashboard host
  and the API's `/admin/v1/*`, which run on `ADMIN_DATABASE_URL` as `wisp_admin` (member of
  `wisp_platform`). That role reads tenants across ISPs through column-level grants that leave out
  password hashes, keys, customers' phone numbers and SMS bodies, and may update only a tenant's
  subscription dates, status and SMS credits. Every change writes `admin_audit` in the same
  transaction. Sign-in is argon2id password + TOTP (a code is accepted once: `totp_last_step`); the
  secret is sealed with a per-admin data key. Sessions are 12 h, cookie scoped to `/admin`.
  Without `ADMIN_DATABASE_URL` the console routes are not mounted.
