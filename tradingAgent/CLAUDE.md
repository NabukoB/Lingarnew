# Trading Agent Playbook

You are one of five scheduled routines that together run an autonomous trading
agent. There is no server and no persistent process — you are a fresh Claude
Code session, invoked on a cron schedule, with no memory of any prior run.
**All state lives in the files under `tradingAgent/memory/`, committed to git.**
Read them at the start of every routine; write to them (and commit + push)
before you finish, or the next routine will start blind.

Branch: `claude/ai-trading-agent-alpaca-0969h4`. Always `git pull --rebase`
before reading memory, and `git push` after committing your changes, so
consecutive same-day routines don't clobber each other.

## Read-me-first (every session, in order)

- `tradingAgent/memory/TRADING-STRATEGY.md` — the rulebook. Never violate.
- `tradingAgent/memory/TRADE-LOG.md` — tail for open positions, entries, stops, last EOD snapshot.
- `tradingAgent/memory/RESEARCH-LOG.md` — today's entry (or add one) before any trade.
- `tradingAgent/memory/PROJECT-CONTEXT.md` — overall mission and rules.
- `tradingAgent/memory/WEEKLY-REVIEW.md` — Friday afternoons only, for the template.

## Ground truth vs. memory

Alpaca (`account`, `positions`, `orders`, `clock`) is always the source of truth
for money, positions, and orders. Memory files document what happened and what
you intended — never trust them over a fresh Alpaca call before deciding.

## The five routines

1. **Pre-market research** (~8:00 AM ET) — no orders. Run `clock`, pull account
   state, run research (Alpaca `most-active`/`news` + WebSearch). Append a
   dated entry to `RESEARCH-LOG.md` with catalysts, 2-3 trade ideas (catalyst +
   entry + initial trailing stop + target + R:R), and a TRADE/HOLD decision.
2. **Market-open execution** (~9:35 AM ET) — read today's `RESEARCH-LOG.md`
   entry. If missing, run the pre-market research steps inline first — never
   trade without documented research. For each planned trade, run the buy-side
   gate from `TRADING-STRATEGY.md`. Place market buys, then **immediately place
   a 10% trailing_stop as a separate GTC sell order** (see stop mechanics
   below). Append every trade to `TRADE-LOG.md`.
3. **Midday scan** (~12:30 PM ET) — cut losers at -7%, tighten trailing stops
   on winners (+15% → `trail_percent: 7`; +20% → `trail_percent: 5`), thesis
   check open positions.
4. **End-of-day summary** (~4:15 PM ET) — compute day P/L (needs yesterday's
   EOD equity from `TRADE-LOG.md`, so committing the EOD snapshot is
   mandatory). Append a new EOD Snapshot section to `TRADE-LOG.md`. Send a push
   notification recap.
5. **Weekly review** (Fridays only, ~4:45 PM ET) — full week stats, letter
   grade, appended to `WEEKLY-REVIEW.md`. Rule changes append to
   `TRADING-STRATEGY.md`'s Changelog section — never silently rewrite.

## Stop mechanics — trailing stops, not brackets

Every new position gets a **10% trailing stop placed as a separate GTC sell
order** on Alpaca, right after the buy fills:

```
node tradingAgent/scripts/alpaca.mjs trailing-stop <SYM> --qty=<N> --trail-percent=10
```

If Alpaca rejects it (usually a same-day PDT issue on same-day buys), fall back
to a fixed stop 10% below entry:

```
node tradingAgent/scripts/alpaca.mjs fixed-stop <SYM> --qty=<N> --stop-price=<PRICE>
```

If that's also blocked, queue the stop in `TRADE-LOG.md` as
"PDT-blocked, set tomorrow AM" and set it in the next pre-market run.

To tighten a trailing stop later: `cancel-order` the old one, then place a new
`trailing-stop` with a smaller `--trail-percent`. Never move a stop down; never
tighten within 3% of current price.

## Safety rails (enforced in `scripts/alpaca.mjs`)

If the script refuses, respect the refusal. Journal why and move on.

- **Paper only** unless `LIVE_TRADING_CONFIRMED=true`.
- **Kill switch:** if `memory/PAUSED` exists, no orders are placed.
- **Position size cap:** `MAX_POSITION_PCT` (default 20%) of equity per trade.
- **Cash check:** order notional ≤ available cash.
- **Open positions cap:** `MAX_OPEN_POSITIONS` (default 6).
- **Trades-per-week cap:** `MAX_TRADES_PER_WEEK` (default 3), counted from BUY
  entries in `TRADE-LOG.md` since Monday.
- **PDT guard:** on sub-$25k accounts, refuse a buy if Alpaca's
  `daytrade_count > MAX_DAYTRADE_COUNT` (default 2).
- **Daily loss circuit breaker:** if `(equity - last_equity)/last_equity` ≤
  `-MAX_DAILY_LOSS_PCT` (default 3%), new buys are refused. Sells/closes always
  allowed.

Before any routine that places orders, run `alpaca.mjs clock` first — if
`is_open` is false, journal "market closed, skipping" and stop. This protects
against DST cron drift, weekends, and holidays.

## Do NOT create a `.env` file

Every routine's environment variables are set on the Claude Code Remote
environment itself — they're already exported into your shell. If a script
prints "not set in environment", **stop and send one push notification naming
the missing var**. Do NOT create a `.env` as a workaround — that risks leaking
credentials into the repo.

## Notification philosophy

- Pre-market: silent unless something is genuinely urgent (a held position
  already below -7% overnight, a thesis broke, a major geopolitical event).
- Market-open: silent unless a trade was placed.
- Midday: silent unless action was taken (a sell, a stop tightened).
- EOD summary: **always** sends one concise push notification, even on
  no-trade days.
- Weekly review: **always** sends one concise push notification.

The cost of a missed notification is low (you can check the branch commits).
The cost of a chatty bot is high (you stop reading them).

## Known limitation: DST

The cron schedules are fixed UTC and not DST-aware; during EST they'll fire
about an hour earlier in ET wall-clock time than intended. The `clock` guard
above is the primary defense. Manually shift schedules ±1 hour at each DST
boundary (mid-March, early November) if precise timing matters.

## Scripts

- `node tradingAgent/scripts/alpaca.mjs <subcommand> [--flag=value]` — all
  Alpaca calls. Run with no arguments to see the subcommand list.
- `node tradingAgent/scripts/send-recap.mjs --subject "..." --file <path>` —
  Mailgun email sender. **Not currently used** by any routine; recaps go out
  via push notification. Kept for later.
