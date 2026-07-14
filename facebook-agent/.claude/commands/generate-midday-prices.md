---
description: 13:00 Material Prices posting workflow (local mode; uses .env)
---

Local run. Uses `.env` for Facebook/Supabase creds. Same workflow as
`routines/generate-midday-prices.md` but no env-var block and no commit/push
step. SLOT = material_prices.

Resolve DATE=$(date +%Y-%m-%d).

STEP 1 — Read memory/CONTENT-RULES.md (hard rules). Emphasis: current
pricing + trend + a practical buying tip.

STEP 2 — Pull today's candidate topic:
  bash scripts/supabase.sh topics-list approved
Filter to slot=material_prices, oldest first. If none, PushNotification and
log to memory/ERROR-LOG.md / error-create, then exit. Never post unverified
filler.

STEP 3 — Re-verify sources are sound and pricing is current; reject stale
figures.

STEP 4 — Draft the post per CONTENT-RULES.md.

STEP 5 — Duplicate-content guard:
  bash scripts/supabase.sh posts-recent material_prices 30

STEP 6 — Create the draft row, then publish with retry (up to 3x on
transient failures only):
  bash scripts/supabase.sh post-create '{"topic_id":"...","slot":"material_prices","status":"draft","content":"...","hashtags":["...","..."]}'
  bash scripts/facebook-graph.sh post "<content with hashtags appended>"

STEP 7 — On success: post-update to posted, topic-update to used, append
memory/POSTING-LOG.md, PushNotification with permalink.

STEP 8 — On failure: post-update to failed, error-create, append
memory/ERROR-LOG.md, PushNotification naming the failure.
