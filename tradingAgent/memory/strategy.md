# Strategy

## Goal

Beat the S&P 500 (SPY) on a rolling basis, measured in `memory/performance.md`,
while trading paper first. Capital preservation beats any single trade — when
in doubt, size down or skip.

## Universe selection (pre-market / midday)

No fixed watchlist. Each cycle, build candidates from:
- `alpaca.mjs most-active --top=20` (by volume and by trades) for liquidity and
  attention.
- `alpaca.mjs news --symbols=<candidates>` for a same-day catalyst — prefer
  names with a concrete reason to move today over pure momentum with no story.

Discard anything you can't get a recent quote/bars for, or that fails the
position-sizing math before you even try the order.

## Entry rules (market-open / midday)

- Only enter with a clear, written thesis (one to three sentences) in the
  journal — no thesis, no trade.
- Every entry is a bracket order: stop-loss at a level that reflects the
  thesis being wrong (not an arbitrary %), take-profit optional.
- Respect the script's rails (position size, open-position cap, daily loss
  breaker) — they are not obstacles to route around.

## Exit / stop management (midday, and implicitly market-open for existing positions)

- Never remove or widen a stop to avoid taking a loss.
- Once a position is meaningfully profitable, consider `replace-order` to
  trail the stop up (never down) rather than taking profit purely on a fixed
  target, if the thesis is still intact.
- If the original thesis is invalidated (not just "price went down"), exit
  rather than waiting for the stop.

## Changelog

Weekly review appends dated entries here when it proposes a rule change.
Nothing above should be edited silently — every change is a new dated entry
with the reasoning that prompted it.

- 2026-07-05 — Initial strategy created. No trades yet; rules above are the
  starting point, not yet tested against live journal data.
