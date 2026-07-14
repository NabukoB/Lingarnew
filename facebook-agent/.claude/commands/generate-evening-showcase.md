---
description: 18:30 Project Showcase posting workflow (local mode; uses .env)
---

Local run. Uses `.env` for Facebook/Supabase creds. Same workflow as
`routines/generate-evening-showcase.md` but no env-var block and no
commit/push step. SLOT = project_showcase.

Resolve DATE=$(date +%Y-%m-%d).

STEP 1 — Read memory/CONTENT-RULES.md (hard rules). Emphasis: a
completed/ongoing project highlight with a craftsmanship angle and a CTA to
inquire.

STEP 2 — Pull today's candidate topic:
  bash scripts/supabase.sh topics-list approved
Filter to slot=project_showcase, oldest first. If none, PushNotification and
log to memory/ERROR-LOG.md / error-create, then exit. Never post unverified
filler.

STEP 3 — Re-verify sources are sound and project details are accurate.

STEP 4 — Draft the post per CONTENT-RULES.md.

STEP 5 — Duplicate-content guard:
  bash scripts/supabase.sh posts-recent project_showcase 30

STEP 6 — Create the draft row, then publish with retry (up to 3x on
transient failures only):
  bash scripts/supabase.sh post-create '{"topic_id":"...","slot":"project_showcase","status":"draft","content":"...","hashtags":["...","..."]}'
  bash scripts/facebook-graph.sh post "<content with hashtags appended>"

STEP 7 — On success: post-update to posted, topic-update to used, append
memory/POSTING-LOG.md, PushNotification with permalink.

STEP 8 — On failure: post-update to failed, error-create, append
memory/ERROR-LOG.md, PushNotification naming the failure.
