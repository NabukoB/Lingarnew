# wisp-saas/web

One Next.js 14 app for the WISP dashboard and the captive portal (see `CLAUDE.md` §3.1 and §14).

| Path | What |
|---|---|
| `/` | Dashboard home (desktop layout; phone layout below `lg`) |
| `/money`, `/network`, `/customers`, `/routers/new` | Dashboard sections |
| `/portal`, `/portal/pay`, `/portal/online`, `/portal/reconnect`, `/portal/voucher`, `/portal/trial` | Captive portal. On a `portal.*` host, `/` is rewritten to `/portal` by `src/middleware.ts` |

Data comes from `src/lib/api.ts`, which returns example data from `src/lib/mock.ts` until the Go API exists.

```bash
npm install
npm run dev        # http://localhost:3010
npm test           # vitest: formatting, phone normalisation, chart maths
npm run lint && npm run type-check && npm run build
```
