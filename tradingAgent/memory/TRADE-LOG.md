# Trade Log

Append-only. Every trade goes here with its full thesis; every trading day
ends with an "EOD Snapshot" section that captures equity, cash, day P/L, and
open positions. Tomorrow's daily-summary computes day-over-day P/L off the
most recent EOD Snapshot in this file, so the EOD commit is mandatory.

## Day 0 — EOD Snapshot (pre-launch baseline)

**Portfolio:** $100,000.00 | **Cash:** $100,000.00 (100%) | **Day P/L:** $0 (0.00%) | **Phase P/L:** $0 (0.00%)

No positions yet. Bot launches tomorrow. Day-0 equity is the starting-capital
placeholder — the first real EOD Snapshot will overwrite the baseline once
Alpaca reports actual equity.
