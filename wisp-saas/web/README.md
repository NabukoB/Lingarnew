# wisp-saas/web

One Next.js 14 app for the WISP dashboard and the captive portal (see `CLAUDE.md` §3.1 and §14).

| Path | What |
|---|---|
| `/login`, `/signup` | Account |
| `/`, `/money`, `/network`, `/customers` | Dashboard (phone layout below `lg`) |
| `/routers/new`, `/routers/[id]` | Add a router (one-time command → live checklist), router page |
| `/packages`, `/packages/hotspot`, `/vouchers` | Plans and printable voucher batches |
| `/settings`, `/settings/sms`, `/settings/billing` | Business, M-Pesa, portal; SMS; our subscription |
| `/portal/*` | Captive portal: buy, pay, online, voucher, reconnect, trial |

## Data

- `src/lib/api.ts` (reads) and `src/lib/actions.ts` (server actions) call the Go API server-side with
  the session token from the HttpOnly `wisp_session` cookie. Without `API_URL` they return example data.
- `src/lib/portal.ts` / `portal-actions.ts` serve the captive portal. The router's login page sends
  `?t=<tenant>&mac=&link=&router=`; `src/middleware.ts` keeps them in the `wisp_portal` cookie and
  maps `portal.*` hosts (and WISPs' own domains, when `DASHBOARD_HOSTS` is set) to `/portal`.
- `src/lib/mappers.ts` turns API JSON into UI types (unit-tested).

```bash
npm install
API_URL=http://localhost:8080 npm run dev    # http://localhost:3010 (omit API_URL for example data)
npm test                                      # vitest
npm run lint && npm run type-check && npm run build
BASE_URL=http://localhost:3010 npm run e2e    # Playwright against a running API + app
```
