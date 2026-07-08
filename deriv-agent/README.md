# Deriv Volatility Indices Trading Agent

Autonomous trading agent for Deriv Volatility Indices with a
multi-indicator signal engine, tier-aware Martingale risk framework,
multi-market recovery strategy, and a live React dashboard.

See [`../DERIV_AGENT_PLAN.md`](../DERIV_AGENT_PLAN.md) for the full plan.

## Layout

```
deriv-agent/
  server/    Express + tRPC + WS backend, Deriv client, engine
  client/    Vite + React dashboard
  supabase/  SQL migrations
```

## Quick start (dev, demo mode)

```bash
cp .env.example .env       # fill DERIV_APP_ID, DERIV_API_TOKEN, Supabase keys
npm install                # installs workspaces
npm run dev:server         # http://localhost:4000
npm run dev:client         # http://localhost:5173
```

Set `DEMO_MODE=true` and use a Deriv **demo** API token before touching
real money. The engine will not enable trading until `tradingEnabled=true`
in `trading_config`.
