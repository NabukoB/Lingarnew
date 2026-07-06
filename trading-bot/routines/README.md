# Cloud Routines

Five weekday routines. Each is a fresh Claude Code cloud session that clones
this repo at `main`, reads memory, runs its workflow, commits new memory
back to `main`, and exits.

## One-time setup

1. Install the Claude GitHub App on this repo (least-privilege: only this repo).
2. Confirm the routine environment has:
   - `ALPACA_API_KEY` (required)
   - `ALPACA_SECRET_KEY` (required)
   - `ALPACA_ENDPOINT` (optional; defaults to live URL)
   - `ALPACA_DATA_ENDPOINT` (optional; defaults to data URL)
3. Enable **"Allow unrestricted branch pushes"** on the routine environment.
   Without this, `git push origin main` fails with a proxy error.
4. Make sure Remote Control is connected so `PushNotification` alerts reach
   your phone.

Do **NOT** create a `.env` file in the cloud. Env vars are set on the routine.

## The five schedules (America/Chicago)

| Routine | Cron | Prompt |
| --- | --- | --- |
| Pre-market | `0 6 * * 1-5` | `routines/pre-market.md` |
| Market-open | `30 8 * * 1-5` | `routines/market-open.md` |
| Midday | `0 12 * * 1-5` | `routines/midday.md` |
| Daily-summary | `0 15 * * 1-5` | `routines/daily-summary.md` |
| Weekly-review | `0 16 * * 5` | `routines/weekly-review.md` |

## Creating a routine

1. Claude Code Web → Routines → New Routine.
2. Name it (e.g. "Trading bot pre-market").
3. Select this repository, branch `main`.
4. Add environment variables from step 2 above.
5. Enable "Allow unrestricted branch pushes".
6. Set the cron + timezone.
7. Paste the matching `routines/*.md` prompt verbatim — do **not** paraphrase.
8. Save → Click "Run now" once to test.

## Notification philosophy

- Pre-market: silent unless genuinely urgent.
- Market-open: `PushNotification` only if a trade was placed.
- Midday: only if action was taken.
- Daily-summary: always, one push.
- Weekly-review: always, one push.
