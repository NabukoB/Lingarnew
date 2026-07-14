---
description: 08:00 Construction Tip posting workflow (local mode; uses .env)
---

Local run. Uses `.env` for Facebook/Supabase creds. Same workflow as
`routines/generate-morning-tip.md` but no env-var block and no commit/push
step. SLOT = construction_tip.

Resolve DATE=$(date +%Y-%m-%d).

STEP 1 — Read memory/CONTENT-RULES.md (hard rules — max 180 words, 3-5
hashtags, curiosity hook + educational value + practical takeaway + CTA,
natural tone, no clickbait, never fabricate a fact).

STEP 2 — Pull today's candidate topic:
  bash scripts/supabase.sh topics-list approved
Filter to slot=construction_tip, oldest first. If none, PushNotification
and log to memory/ERROR-LOG.md / error-create, then exit. Never post
unverified filler.

STEP 3 — Re-verify the topic's sources are still sound; downgrade/reject if
stale.

STEP 4 — Draft the post per CONTENT-RULES.md.

STEP 5 — Duplicate-content guard:
  bash scripts/supabase.sh posts-recent construction_tip 30

STEP 6 — Create the draft row, then publish with retry (up to 3x on
transient failures only):
  bash scripts/supabase.sh post-create '{"topic_id":"...","slot":"construction_tip","status":"draft","content":"...","hashtags":["...","..."]}'
  bash scripts/facebook-graph.sh post "<content with hashtags appended>"

STEP 7 — On success: post-update to posted, topic-update to used, append
memory/POSTING-LOG.md, PushNotification with permalink.

STEP 8 — On failure: post-update to failed, error-create, append
memory/ERROR-LOG.md, PushNotification naming the failure.
