# Trading Bot

Autonomous swing-trading agent built on Claude Code cloud routines. Places
real trades on Alpaca, researches with Claude's native `WebSearch` (and Deep
Research for broad questions), notifies via Claude's native `PushNotification`.
Stateless between runs — all memory lives in this repo as markdown.

## Strategy at a glance

- Stocks only. **No options, ever.**
- ~$10k account, 5-6 positions max, 20% per position max.
- 10% trailing stop on every position as a real GTC order.
- Cut losers at -7%; tighten trail to 7% at +15%, 5% at +20%.
- Max 3 new trades per week. Patience > activity.

Full rules: `memory/TRADING-STRATEGY.md`.

## Layout

```
trading-bot/
├── CLAUDE.md              # Agent rulebook (auto-loaded every session)
├── env.template           # Template for local .env file
├── scripts/alpaca.sh      # Only external API wrapper
├── routines/*.md          # Cloud routine prompts (production)
├── .claude/commands/*.md  # Local slash commands (dev / ad-hoc)
└── memory/                # Persistent state, committed to main
```

## Setup — local mode

1. `cp env.template .env` and fill in `ALPACA_API_KEY` + `ALPACA_SECRET_KEY`.
2. `chmod +x scripts/alpaca.sh`.
3. Open this folder in Claude Code and run `/portfolio` — you should see
   account + positions print cleanly.

Local mode uses your `.env` file. `.env` is gitignored.

## Setup — cloud routines (production)

Five weekday routines, all in America/Chicago:

| Routine | Cron | What it does |
| --- | --- | --- |
| Pre-market | `0 6 * * 1-5` | Research the day, write trade ideas |
| Market-open | `30 8 * * 1-5` | Execute planned trades + place stops |
| Midday | `0 12 * * 1-5` | Cut losers, tighten stops on winners |
| Daily-summary | `0 15 * * 1-5` | EOD snapshot + push notification |
| Weekly-review | `0 16 * * 5` | Friday recap + letter grade |

For each routine:

1. In Claude Code Web → Routines → New Routine, name it and select this repo.
2. Set the cron + timezone above.
3. Set environment variables: `ALPACA_API_KEY`, `ALPACA_SECRET_KEY`
   (and optionally `ALPACA_ENDPOINT`, `ALPACA_DATA_ENDPOINT`).
   **Do NOT create a `.env` file in the cloud repo.**
4. Enable "Allow unrestricted branch pushes" on the routine's environment.
5. Paste the matching `routines/*.md` prompt verbatim.
6. Save. Click "Run now" once to verify.

Notifications land on your phone via Claude Code's push channel (make sure
Remote Control is connected to receive them). See PDF Part 11 for the
notification philosophy.

## Memory

Five markdown files under `memory/` are the agent's only state between runs.
Every trade, every research entry, every EOD snapshot is a git commit on
`main`. Rollback = `git revert`. Audit = `git log`.
