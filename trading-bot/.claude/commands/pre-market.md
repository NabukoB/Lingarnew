---
description: Pre-market research workflow (local mode; uses .env)
---

Local pre-market research. Uses `.env` for Alpaca creds. Same workflow as
`routines/pre-market.md` but no env-var block and no commit/push step.

Resolve DATE=$(date +%Y-%m-%d).

STEP 1 — Read memory:
- memory/TRADING-STRATEGY.md
- tail of memory/TRADE-LOG.md
- tail of memory/RESEARCH-LOG.md

STEP 2 — Pull live state:
  bash scripts/alpaca.sh account
  bash scripts/alpaca.sh positions
  bash scripts/alpaca.sh orders

STEP 3 — Research via WebSearch (Deep Research for sector momentum survey):
- WTI/Brent oil
- S&P 500 futures premarket
- VIX
- Top catalysts today $DATE
- Earnings before open
- Economic calendar (CPI, PPI, FOMC, jobs)
- S&P 500 sector momentum YTD
- News on each currently-held ticker

STEP 4 — Write dated entry to memory/RESEARCH-LOG.md:
- Account snapshot
- Market context (oil, indices, VIX, releases)
- 2-3 actionable trade ideas (catalyst / entry / stop / target / R:R)
- Risk factors
- Decision: TRADE or HOLD (default HOLD)

STEP 5 — Optional PushNotification if urgent. Otherwise silent.
