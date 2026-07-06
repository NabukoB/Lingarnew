---
description: Midday scan workflow (local mode; uses .env)
---

Local midday scan. Uses `.env` for Alpaca creds. Same workflow as
`routines/midday.md` but no env-var block and no commit/push step.

Resolve DATE=$(date +%Y-%m-%d).

STEP 1 — Read memory:
- memory/TRADING-STRATEGY.md (exit rules)
- tail of memory/TRADE-LOG.md (entries, thesis, stops)
- today's memory/RESEARCH-LOG.md entry

STEP 2 — Pull state:
  bash scripts/alpaca.sh positions
  bash scripts/alpaca.sh orders

STEP 3 — Cut losers (unrealized_plpc ≤ -0.07):
  bash scripts/alpaca.sh close SYM
  bash scripts/alpaca.sh cancel ORDER_ID
Log exit to TRADE-LOG with realized P&L and reason.

STEP 4 — Tighten trailing stops on winners:
- Up ≥ +20% -> trail_percent "5"
- Up ≥ +15% -> trail_percent "7"
Never within 3% of current price. Never move a stop down.

STEP 5 — Thesis check. Cut if broken even before -7%.

STEP 6 — Optional WebSearch for anything moving sharply with no cause.
Append addendum to RESEARCH-LOG.

STEP 7 — PushNotification only if action was taken.
