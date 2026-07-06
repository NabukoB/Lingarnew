---
description: Daily-summary workflow (local mode; uses .env)
---

Local end-of-day summary. Uses `.env` for Alpaca creds. Same workflow as
`routines/daily-summary.md` but no env-var block and no commit/push step.

Resolve DATE=$(date +%Y-%m-%d).

STEP 1 — Read memory:
- tail of memory/TRADE-LOG.md (previous EOD equity)
- Count TRADE-LOG entries dated today
- Count trades this week

STEP 2 — Pull final state:
  bash scripts/alpaca.sh account
  bash scripts/alpaca.sh positions
  bash scripts/alpaca.sh orders

STEP 3 — Compute:
- Day P&L ($ and %)
- Phase cumulative P&L ($ and %)
- Trades today
- Trades this week

STEP 4 — Append EOD snapshot to memory/TRADE-LOG.md:
### MMM DD — EOD Snapshot (Day N, Weekday)
**Portfolio:** $X | **Cash:** $X (X%) | **Day P&L:** ±$X (±X%) | **Phase P&L:** ±$X (±X%)
| Ticker | Shares | Entry | Close | Day Chg | Unrealized P&L | Stop |
**Notes:** ...

STEP 5 — PushNotification (always, one line, ≤200 chars):
"EOD MMM DD: $X (±X% day, ±X% phase). Trades: <list or none>. Open: SYM ±X%."
