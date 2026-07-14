#!/usr/bin/env bash
# Facebook Graph API wrapper. All Graph API calls go through here.
# Usage: bash scripts/facebook-graph.sh <subcommand> [args...]

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${FACEBOOK_ACCESS_TOKEN:?FACEBOOK_ACCESS_TOKEN not set in environment}"
: "${FACEBOOK_PAGE_ID:?FACEBOOK_PAGE_ID not set in environment}"

GRAPH="https://graph.facebook.com/v20.0"

cmd="${1:-}"
shift || true

case "$cmd" in
  page-info)
    curl -fsS "$GRAPH/$FACEBOOK_PAGE_ID?fields=id,name,fan_count&access_token=$FACEBOOK_ACCESS_TOKEN"
    ;;
  post)
    message="${1:?usage: post 'text'}"
    curl -fsS -X POST "$GRAPH/$FACEBOOK_PAGE_ID/feed" \
      --data-urlencode "message=$message" \
      --data-urlencode "access_token=$FACEBOOK_ACCESS_TOKEN"
    ;;
  post-link)
    message="${1:?usage: post-link 'text' 'url'}"
    link="${2:?usage: post-link 'text' 'url'}"
    curl -fsS -X POST "$GRAPH/$FACEBOOK_PAGE_ID/feed" \
      --data-urlencode "message=$message" \
      --data-urlencode "link=$link" \
      --data-urlencode "access_token=$FACEBOOK_ACCESS_TOKEN"
    ;;
  get-post)
    id="${1:?usage: get-post POST_ID}"
    curl -fsS "$GRAPH/$id?fields=message,created_time,permalink_url&access_token=$FACEBOOK_ACCESS_TOKEN"
    ;;
  post-insights)
    id="${1:?usage: post-insights POST_ID}"
    curl -fsS "$GRAPH/$id/insights?metric=post_impressions,post_engaged_users,post_reactions_like_total,post_clicks&access_token=$FACEBOOK_ACCESS_TOKEN"
    ;;
  page-insights)
    curl -fsS "$GRAPH/$FACEBOOK_PAGE_ID/insights?metric=page_impressions,page_engaged_users&period=day&access_token=$FACEBOOK_ACCESS_TOKEN"
    ;;
  delete-post)
    id="${1:?usage: delete-post POST_ID}"
    curl -fsS -X DELETE "$GRAPH/$id?access_token=$FACEBOOK_ACCESS_TOKEN"
    ;;
  debug-token)
    curl -fsS "$GRAPH/debug_token?input_token=$FACEBOOK_ACCESS_TOKEN&access_token=$FACEBOOK_ACCESS_TOKEN"
    ;;
  *)
    echo "Usage: bash scripts/facebook-graph.sh <page-info|post|post-link|get-post|post-insights|page-insights|delete-post|debug-token> [args]" >&2
    exit 1
    ;;
esac
echo
