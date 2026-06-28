#!/usr/bin/env bash
# Run this after: vercel login && vercel link (inside fundiOps/)
# Fill in each CHANGE_ME value below before running.

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

add_env() {
  local key="$1"
  local value="$2"
  echo "$value" | vercel env add "$key" production --force
  echo "$value" | vercel env add "$key" preview --force
  echo "$value" | vercel env add "$key" development --force
}

echo "Adding environment variables to Vercel..."

add_env NEXT_PUBLIC_SUPABASE_URL        "CHANGE_ME_SUPABASE_URL"
add_env NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "CHANGE_ME_PUBLISHABLE_KEY"
add_env SUPABASE_SERVICE_ROLE_KEY       "CHANGE_ME_SERVICE_ROLE_KEY"
add_env OPENAI_API_KEY                  "CHANGE_ME_OPENAI_KEY"
add_env WHATSAPP_ACCESS_TOKEN           "CHANGE_ME_WA_ACCESS_TOKEN"
add_env WHATSAPP_PHONE_NUMBER_ID        "CHANGE_ME_PHONE_NUMBER_ID"
add_env WHATSAPP_BUSINESS_ACCOUNT_ID    "CHANGE_ME_WABA_ID"
add_env WHATSAPP_APP_SECRET             "CHANGE_ME_APP_SECRET"
add_env WHATSAPP_WEBHOOK_VERIFY_TOKEN   "fundiops2024"
add_env CRON_SECRET                     "CHANGE_ME_CRON_SECRET"

echo ""
echo "Done! Two variables still need to be added manually after deploy:"
echo "  NEXT_PUBLIC_APP_URL        — your Vercel deployment URL"
echo "  WHATSAPP_OWNER_USER_ID     — your Supabase user UUID (after first login)"
