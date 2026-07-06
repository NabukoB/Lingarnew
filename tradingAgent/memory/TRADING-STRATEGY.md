# Trading Strategy

## Mission

Beat the S&P 500 over the challenge window. Stocks only — no options, ever.

## Capital & Constraints

- Starting capital: ~$100,000 paper (Alpaca default). Real target scale later.
- Platform: Alpaca (paper endpoint until `LIVE_TRADING_CONFIRMED=true`).
- Instruments: Stocks ONLY.
- PDT limit: 3 day trades per 5 rolling business days on accounts under $25k.

## Core Rules

1. **NO OPTIONS** — ever.
2. **75-85%** of equity deployed at a target — not fully invested, not sitting in cash.
3. **5-6 open positions** at a time, maximum.
4. **20%** of equity per position, maximum.
5. **Max 3 new trades per week** — patience beats activity.
6. **10% trailing stop** on every new position, placed as a real `trailing_stop` GTC order on Alpaca. Never mental. Never a bracket-order fixed stop.
7. **Cut losers manually at -7%** from entry — do not wait for the trailing stop to catch up.
8. **Tighten the trail** to `trail_percent: 7` at +15% unrealized, to `trail_percent: 5` at +20%.
9. **Never tighten a stop to within 3%** of current price. **Never move a stop down.**
10. **Follow sector momentum.** Exit an entire sector after 2 consecutive failed trades in it.
11. **Patience > activity.** A week with zero new trades can be the right answer.

## Buy-Side Gate (every check must pass, or skip and log why)

- Total positions after this fill ≤ 6.
- Trades placed this week (including this one) ≤ 3.
- Position cost ≤ 20% of account equity.
- Position cost ≤ available cash.
- `daytrade_count` from Alpaca ≤ 2 (leaves room under the 3-per-5-day PDT ceiling).
- A specific catalyst for today is documented in today's RESEARCH-LOG entry.
- Instrument is a stock (not an option, not anything else).

## Sell-Side Rules (evaluated at midday scan and opportunistically)

- Unrealized P/L ≤ -7% → close immediately.
- Thesis broken (catalyst invalidated, sector rolling over, adverse news) → close, even before -7%.
- Up ≥ +20% → cancel old trailing stop, place new one with `trail_percent: 5`.
- Up ≥ +15% → cancel old trailing stop, place new one with `trail_percent: 7`.
- Sector has 2 consecutive failed trades → exit all positions in that sector.

## Entry Checklist (agent must document in RESEARCH-LOG before every buy)

- What is today's specific catalyst?
- Is the sector in momentum?
- What is the stop level (initial trailing stop is 10% — note the implied stop price)?
- What is the target (minimum 2:1 risk/reward)?

## Changelog

Weekly review appends dated entries here when it proposes a rule change. Nothing
above is edited silently — every change is a new dated entry with the reasoning
that prompted it.

- 2026-07-05 — Initial strategy adopted from Nate Herk's "Opus 4.7 Trading Bot"
  setup guide (his rules learned across a prior 30-day live challenge). No
  trades yet against these rules in this bot.
