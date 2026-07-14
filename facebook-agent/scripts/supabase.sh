#!/usr/bin/env bash
# Supabase PostgREST wrapper. All Supabase data access goes through here.
# Usage: bash scripts/supabase.sh <subcommand> [args...]

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${SUPABASE_URL:?SUPABASE_URL not set in environment}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY not set in environment}"

REST="$SUPABASE_URL/rest/v1"
H_KEY="apikey: $SUPABASE_SERVICE_ROLE_KEY"
H_AUTH="Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
H_JSON="Content-Type: application/json"
H_REP="Prefer: return=representation"

cmd="${1:-}"
shift || true

case "$cmd" in
  topics-list)
    status="${1:-approved}"
    curl -fsS -H "$H_KEY" -H "$H_AUTH" \
      "$REST/facebook_topics?status=eq.$status&order=created_at.asc"
    ;;
  topics-recent-used)
    days="${1:?usage: topics-recent-used N}"
    since=$(date -u -d "-$days days" +%Y-%m-%dT%H:%M:%SZ)
    curl -fsS -H "$H_KEY" -H "$H_AUTH" \
      "$REST/facebook_topics?used_at=gte.$since&select=title,slot,used_at"
    ;;
  topic-create)
    body="${1:?usage: topic-create '<json>'}"
    curl -fsS -X POST -H "$H_KEY" -H "$H_AUTH" -H "$H_JSON" -H "$H_REP" \
      -d "$body" "$REST/facebook_topics"
    ;;
  topic-update)
    id="${1:?usage: topic-update ID '<json>'}"
    body="${2:?usage: topic-update ID '<json>'}"
    curl -fsS -X PATCH -H "$H_KEY" -H "$H_AUTH" -H "$H_JSON" \
      -d "$body" "$REST/facebook_topics?id=eq.$id"
    ;;
  source-create)
    body="${1:?usage: source-create '<json>'}"
    curl -fsS -X POST -H "$H_KEY" -H "$H_AUTH" -H "$H_JSON" -H "$H_REP" \
      -d "$body" "$REST/facebook_sources"
    ;;
  post-create)
    body="${1:?usage: post-create '<json>'}"
    curl -fsS -X POST -H "$H_KEY" -H "$H_AUTH" -H "$H_JSON" -H "$H_REP" \
      -d "$body" "$REST/facebook_posts"
    ;;
  post-update)
    id="${1:?usage: post-update ID '<json>'}"
    body="${2:?usage: post-update ID '<json>'}"
    curl -fsS -X PATCH -H "$H_KEY" -H "$H_AUTH" -H "$H_JSON" \
      -d "$body" "$REST/facebook_posts?id=eq.$id"
    ;;
  posts-recent)
    slot="${1:?usage: posts-recent SLOT DAYS}"
    days="${2:?usage: posts-recent SLOT DAYS}"
    since=$(date -u -d "-$days days" +%Y-%m-%dT%H:%M:%SZ)
    curl -fsS -H "$H_KEY" -H "$H_AUTH" \
      "$REST/facebook_posts?slot=eq.$slot&posted_at=gte.$since&select=content,posted_at"
    ;;
  posts-for-analytics)
    days="${1:-7}"
    since=$(date -u -d "-$days days" +%Y-%m-%dT%H:%M:%SZ)
    curl -fsS -H "$H_KEY" -H "$H_AUTH" \
      "$REST/facebook_posts?status=eq.posted&posted_at=gte.$since&select=id,fb_post_id"
    ;;
  analytics-create)
    body="${1:?usage: analytics-create '<json>'}"
    curl -fsS -X POST -H "$H_KEY" -H "$H_AUTH" -H "$H_JSON" -H "$H_REP" \
      -d "$body" "$REST/facebook_analytics"
    ;;
  error-create)
    body="${1:?usage: error-create '<json>'}"
    curl -fsS -X POST -H "$H_KEY" -H "$H_AUTH" -H "$H_JSON" -H "$H_REP" \
      -d "$body" "$REST/facebook_errors"
    ;;
  *)
    echo "Usage: bash scripts/supabase.sh <topics-list|topics-recent-used|topic-create|topic-update|source-create|post-create|post-update|posts-recent|posts-for-analytics|analytics-create|error-create> [args]" >&2
    exit 1
    ;;
esac
echo
