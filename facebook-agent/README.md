# Facebook Agent

Autonomous Facebook content-marketing agent for fundiOps (a construction-trade
CRM business), built on Claude Code cloud routines. Researches verified
information, drafts posts, publishes to a Facebook Page via the Graph API, and
tracks analytics. Stateless between runs — operational data lives in Supabase
(fundiOps' project); governance docs and human-readable logs live in this
repo as markdown.

## Schedule at a glance

- 08:00 Construction Tip
- 13:00 Material Prices
- 18:30 Project Showcase

All times Africa/Nairobi. Full cron table: `routines/README.md`.
Full content rules: `memory/CONTENT-RULES.md`.

## Layout

```
facebook-agent/
├── CLAUDE.md                 # Agent rulebook (auto-loaded every session)
├── env.template               # Template for local .env file
├── scripts/
│   ├── facebook-graph.sh      # Only Facebook Graph API wrapper
│   └── supabase.sh            # Only Supabase (PostgREST) wrapper
├── routines/*.md               # Cloud routine prompts (production)
├── .claude/commands/*.md       # Local slash commands (dev / ad-hoc)
├── memory/                     # Persistent governance docs + logs, committed to main
└── supabase/migrations/        # Schema for facebook_topics/sources/posts/analytics/errors
```

## Setup — local mode

1. `cp env.template .env` and fill in `FACEBOOK_ACCESS_TOKEN`,
   `FACEBOOK_PAGE_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (the
   Supabase values are the same ones fundiOps already uses).
2. `chmod +x scripts/*.sh`.
3. Apply `supabase/migrations/*.sql` to fundiOps' Supabase project (once).
4. Open this folder in Claude Code and run `/research` — you should see
   topics/sources written to Supabase and `memory/RESEARCH-LOG.md` appended.

Local mode uses your `.env` file. `.env` is gitignored.

## Setup — cloud routines (production)

Five daily routines, all in Africa/Nairobi:

| Routine | Cron | What it does |
| --- | --- | --- |
| Research | `0 5 * * *` | Research + verify topics for all 3 slots |
| Morning tip | `0 8 * * *` | Draft + publish the Construction Tip post |
| Midday prices | `0 13 * * *` | Draft + publish the Material Prices post |
| Evening showcase | `30 18 * * *` | Draft + publish the Project Showcase post |
| Analytics collect | `0 21 * * *` | Pull post insights into Supabase |

For each routine: install the Claude GitHub App, set environment variables
(`FACEBOOK_ACCESS_TOKEN`, `FACEBOOK_PAGE_ID`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`), enable "Allow unrestricted branch pushes", paste
the matching `routines/*.md` prompt verbatim, and run once to verify. Full
checklist: `routines/README.md`.

## Data

`facebook_topics`, `facebook_sources`, `facebook_posts`, `facebook_analytics`,
`facebook_errors` in Supabase are the system of record. `memory/*.md` holds
governance docs (mission, rules) plus a human-readable mirror of research and
posting activity — every routine run that touches them is a git commit on
`main`. Rollback = `git revert`. Audit = `git log`.

## Roadmap (later phases, not in this slice)

Image generation, comment replies, weekly reports (Phase 2); other platforms
(Phase 3); lead scoring / CRM integration (Phase 4).
