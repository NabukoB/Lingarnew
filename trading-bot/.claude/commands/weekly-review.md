---
description: Weekly-review workflow (local mode; uses .env)
---

Local Friday weekly review. Uses `.env` for Alpaca creds. Same workflow as
`routines/weekly-review.md` but no env-var block and no commit/push step.

Resolve DATE=$(date +%Y-%m-%d).

STEP 1 — Read memory:
- memory/WEEKLY-REVIEW.md (template)
- all this week's memory/TRADE-LOG.md entries
- all this week's memory/RESEARCH-LOG.md entries
- memory/TRADING-STRATEGY.md

STEP 2 — Pull week-end state:
  bash scripts/alpaca.sh account
  bash scripts/alpaca.sh positions

STEP 3 — Compute:
- Starting portfolio (Monday AM equity)
- Ending portfolio (today's equity)
- Week return ($ and %)
- S&P 500 week return via WebSearch: "S&P 500 weekly performance week ending $DATE"
- Trades (W/L/open)
- Win rate
- Best/worst trade
- Profit factor

STEP 4 — Append full review section to memory/WEEKLY-REVIEW.md.

STEP 5 — If a rule needs to change, update memory/TRADING-STRATEGY.md and
call out the change in the review.

STEP 6 — PushNotification (always, one line, ≤200 chars):
"Week MMM DD: $X (±X% wk, ±X% phase) vs S&P ±X%. Trades N (W:X L:Y). Grade: X."
