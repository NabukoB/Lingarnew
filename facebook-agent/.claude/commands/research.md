---
description: Daily research workflow (local mode; uses .env)
---

Local research run. Uses `.env` for Facebook/Supabase creds. Same workflow
as `routines/research.md` but no env-var block and no commit/push step.

Resolve DATE=$(date +%Y-%m-%d).

STEP 1 — Read memory:
- memory/PROJECT-CONTEXT.md
- memory/CONTENT-RULES.md (hard rules — never violate)

STEP 2 — Pull live duplicate-avoidance state:
  bash scripts/supabase.sh topics-recent-used 30
  bash scripts/supabase.sh topics-list proposed
  bash scripts/supabase.sh topics-list approved

STEP 3 — For each of the 3 slots (construction_tip, material_prices,
project_showcase) with fewer than 2 'approved' topics queued, research and
propose 1-2 new topics. Require 2+ reputable, independently corroborating
sources per claim. Reject anything duplicating a topic used in the last 30
days, or with thin/conflicting sourcing.

STEP 4 — Write approved and rejected topics + their sources:
  bash scripts/supabase.sh topic-create '{"slot":"...","title":"...","summary":"...","status":"approved"}'
  bash scripts/supabase.sh source-create '{"topic_id":"...","url":"...","title":"...","publisher":"...","reliability":"high|medium|low","notes":"..."}'

STEP 5 — Append a dated entry to memory/RESEARCH-LOG.md matching the
existing template exactly.

STEP 6 — PushNotification only if a slot ends with zero approved topics
queued.
