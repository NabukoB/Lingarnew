---
description: Analytics collection workflow (local mode; uses .env)
---

Local run. Uses `.env` for Facebook/Supabase creds. Same workflow as
`routines/analytics-collect.md` but no env-var block and no commit/push step.

Resolve DATE=$(date +%Y-%m-%d).

STEP 1 — Pull posts needing fresh metrics:
  bash scripts/supabase.sh posts-for-analytics 7

STEP 2 — For each post: bash scripts/facebook-graph.sh post-insights <fb_post_id>
Retry transient failures up to 3x. On a per-post error (after retries), skip
it, log it via error-create, and continue.

STEP 3 — Write results for each successful collection:
  bash scripts/supabase.sh analytics-create '{"post_id":"...","impressions":N,"engaged_users":N,"reactions":N,"comments":N,"shares":N,"clicks":N,"raw":{...}}'

STEP 4 — PushNotification only if 2+ posts failed collection this run.
