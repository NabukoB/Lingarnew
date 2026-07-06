---
description: Market-open execution workflow (local mode; uses .env)
---

Local market-open execution. Uses `.env` for Alpaca creds. Same workflow as
`routines/market-open.md` but no env-var block and no commit/push step.

Resolve DATE=$(date +%Y-%m-%d).

STEP 1 — Read memory:
- memory/TRADING-STRATEGY.md
- TODAY's entry in memory/RESEARCH-LOG.md (if missing, run pre-market STEPS 1-3 inline)
- tail of memory/TRADE-LOG.md (weekly trade count)

STEP 2 — Re-validate with live data:
  bash scripts/alpaca.sh account
  bash scripts/alpaca.sh positions
  bash scripts/alpaca.sh quote <ticker>

STEP 3 — Hard-check buy-side gate. Skip any trade that fails and log reason:
- Total positions after ≤ 6
- Trades this week ≤ 3
- Position cost ≤ 20% of equity
- Position cost ≤ available cash
- Catalyst documented
- daytrade_count leaves room
- Stock only

STEP 4 — Execute buys (market, day TIF):
  bash scripts/alpaca.sh order '{"symbol":"SYM","qty":"N","side":"buy","type":"market","time_in_force":"day"}'

STEP 5 — Immediately place 10% trailing stop GTC. On PDT rejection, fall back
to fixed stop; if also blocked, queue in TRADE-LOG.

STEP 6 — Append trades to memory/TRADE-LOG.md.

STEP 7 — PushNotification only if a trade was placed (one line, ≤200 chars).
