# Project Context

## Overview
- What: Autonomous Facebook content generation & scheduling agent
- Business: fundiOps (construction-trade CRM) — this is its marketing arm
- Platform: Facebook Graph API (single Page), Supabase (fundiOps' project)
- Publishing schedule: 08:00 Construction Tip, 13:00 Material Prices,
  18:30 Project Showcase (Africa/Nairobi)
- Phase: 1 — research, generation, scheduling/posting, analytics.
  No image generation, comment replies, or other platforms yet.

## Rules
- NEVER fabricate a fact. Every claim needs 2+ reputable, independent sources.
- NEVER publish unverified content — skip the slot and notify instead.
- No duplicate topic within 30 days.

## Key Files — Read Every Session
- memory/PROJECT-CONTEXT.md (this file)
- memory/CONTENT-RULES.md
- memory/RESEARCH-LOG.md
- memory/POSTING-LOG.md
- memory/ERROR-LOG.md

## Tooling
- Facebook API: `bash scripts/facebook-graph.sh` (the only wrapper)
- Data: `bash scripts/supabase.sh` (the only wrapper)
- Research: built-in `WebSearch` tool; Deep Research for broad questions
- Notifications: built-in `PushNotification` tool
