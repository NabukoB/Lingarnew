# Cloud Routines

Five daily routines. Each is a fresh Claude Code cloud session that clones
this repo at `main`, reads memory, runs its workflow, commits any new memory
back to `main`, and exits.

## One-time setup

1. Install the Claude GitHub App on this repo (least-privilege: only this repo).
2. Confirm the routine environment has:
   - `FACEBOOK_ACCESS_TOKEN` (required)
   - `FACEBOOK_PAGE_ID` (required)
   - `SUPABASE_URL` (required — same project as fundiOps)
   - `SUPABASE_SERVICE_ROLE_KEY` (required — same project as fundiOps)
3. Enable **"Allow unrestricted branch pushes"** on the routine environment.
   Without this, `git push origin main` fails with a proxy error.
4. Make sure Remote Control is connected so `PushNotification` alerts reach
   your phone.

Do **NOT** create a `.env` file in the cloud. Env vars are set on the routine.

## The five schedules (Africa/Nairobi)

| Routine | Cron | Prompt |
| --- | --- | --- |
| Research | `0 5 * * *` | `routines/research.md` |
| Morning tip | `0 8 * * *` | `routines/generate-morning-tip.md` |
| Midday prices | `0 13 * * *` | `routines/generate-midday-prices.md` |
| Evening showcase | `30 18 * * *` | `routines/generate-evening-showcase.md` |
| Analytics collect | `0 21 * * *` | `routines/analytics-collect.md` |

## Creating a routine

1. Claude Code Web → Routines → New Routine.
2. Name it (e.g. "Facebook agent — morning tip").
3. Select this repository, branch `main`.
4. Add environment variables from step 2 above.
5. Enable "Allow unrestricted branch pushes".
6. Set the cron + timezone (Africa/Nairobi).
7. Paste the matching `routines/*.md` prompt verbatim — do **not** paraphrase.
8. Save → Click "Run now" once to test.

## Notification philosophy

- Research: silent unless a slot ends the day with zero approved topics queued.
- Morning tip / Midday prices / Evening showcase: always notify on success
  (one-liner with permalink) and always notify on failure. No silent
  publication failures.
- Analytics collect: silent unless 2+ posts failed collection.

## Auto-merge

Routine runs push to a per-run `claude/*` branch and open a PR into `main`.
`.github/workflows/auto-merge-trading-bot.yml` (repo root) already
auto-merges any PR from a `claude/*` branch, so it covers these routines
too — no separate workflow needed here.
