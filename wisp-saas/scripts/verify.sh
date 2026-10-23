#!/usr/bin/env bash
# Validates the whole build end to end and measures performance, then writes
# one report. Needs Go, Node, Docker and a Chromium for Playwright.
#
#   scripts/verify.sh              # everything
#   SKIP_RADIUS_E2E=1 scripts/verify.sh   # skip the FreeRADIUS image build
#   PERF_BUDGET_SCALE=2 scripts/verify.sh # slow machine: loosen time budgets
#
# Steps: lint → Go unit + integration → web unit → API/RADIUS load budgets →
# real FreeRADIUS e2e → production web build + bundle budgets → a full stack
# (Postgres, API, web) driven by every Playwright spec, including the admin
# console and Core Web Vitals. The report lands in reports/verify-<time>/.
set -uo pipefail
cd "$(dirname "$0")/.."
ROOT=$PWD
STAMP=$(date -u +%Y%m%d-%H%M%S)
OUT=${VERIFY_REPORT:-$ROOT/reports/verify-$STAMP}
mkdir -p "$OUT/logs"
export GOTOOLCHAIN=${GOTOOLCHAIN:-local} PERF_REPORT=$OUT PERF_BUDGET_SCALE=${PERF_BUDGET_SCALE:-1}

PG_PORT=${VERIFY_PG_PORT:-55440}
API_PORT=${VERIFY_API_PORT:-8090}
WEB_PORT=${VERIFY_WEB_PORT:-3030}
PG_NAME=wisp-verify-pg
PIDS=()
cleanup() {
  for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null; done
  docker rm -f "$PG_NAME" >/dev/null 2>&1
}
trap cleanup EXIT

declare -a NAMES STATUS SECS
FAILED=0
step() { # step "name" command...
  local name=$1; shift
  local log="$OUT/logs/$(echo "$name" | tr ' /' '__').log" t0=$SECONDS
  printf '▶ %-34s' "$name"
  if "$@" >"$log" 2>&1; then s=pass; else s=FAIL; FAILED=1; fi
  NAMES+=("$name"); STATUS+=("$s"); SECS+=($((SECONDS - t0)))
  printf '%s (%ss)\n' "$s" $((SECONDS - t0))
  [ "$s" = FAIL ] && tail -20 "$log" | sed 's/^/    /'
  return 0
}
skip() { NAMES+=("$1"); STATUS+=("skipped: $2"); SECS+=(0); printf '▶ %-34sskipped (%s)\n' "$1" "$2"; }

wait_for() { for _ in $(seq 1 "${2:-60}"); do curl -sf -o /dev/null "$1" && return 0; sleep 1; done; return 1; }

start_stack() {
  docker rm -f "$PG_NAME" >/dev/null 2>&1
  docker run -d --name "$PG_NAME" -e POSTGRES_USER=owner -e POSTGRES_PASSWORD=owner -e POSTGRES_DB=wisp \
    -e APP_DB_PASSWORD=wisp_api -e ADMIN_DB_PASSWORD=wisp_admin \
    -v "$ROOT/infra/postgres/01-app-role.sh:/docker-entrypoint-initdb.d/01-app-role.sh:ro" \
    -p "$PG_PORT:5432" postgres:16-alpine || return 1
  for _ in $(seq 1 60); do docker exec "$PG_NAME" pg_isready -U owner -d wisp -h 127.0.0.1 >/dev/null 2>&1 && break; sleep 1; done
  sleep 2
  go build -o "$OUT/api" ./cmd/api || return 1
  export DATABASE_URL="postgres://wisp_api:wisp_api@localhost:$PG_PORT/wisp?sslmode=disable"
  export ADMIN_DATABASE_URL="postgres://wisp_admin:wisp_admin@localhost:$PG_PORT/wisp?sslmode=disable"
  export MIGRATE_DATABASE_URL="postgres://owner:owner@localhost:$PG_PORT/wisp?sslmode=disable"
  export LOCAL_KEK=$(openssl rand -base64 32) RADIUS_SECRET_SEED=verify HTTP_ADDR=":$API_PORT"
  export PORTAL_BASE_URL="http://localhost:$WEB_PORT/portal" DASHBOARD_URL="http://localhost:$WEB_PORT"
  export WG_SERVER_PUBLIC_KEY=c2VydmVyLXB1YmxpYy1rZXktMzItYnl0ZXMtbG9uZyE= ALLOWED_ORIGINS="http://localhost:$WEB_PORT"
  "$OUT/api" >"$OUT/logs/api-server.log" 2>&1 &
  PIDS+=($!)
  wait_for "http://localhost:$API_PORT/healthz" 60 || { echo "API did not come up on :$API_PORT"; return 1; }
  local pw="verify-admin-$(openssl rand -hex 8)"
  local secret
  secret=$(ADMIN_PASSWORD="$pw" "$OUT/api" -role add-admin -email verify-admin@example.com -name Verify | sed -n 's/^  secret: //p')
  [ -n "$secret" ] || { echo "could not create the staff account"; return 1; }
  export E2E_ADMIN_EMAIL=verify-admin@example.com E2E_ADMIN_PASSWORD=$pw E2E_ADMIN_SECRET=$secret
  rm -rf "$OUT/web" && cp -r web/.next/standalone "$OUT/web" && cp -r web/.next/static "$OUT/web/.next/static" || return 1
  (cd "$OUT/web" && PORT=$WEB_PORT HOSTNAME=127.0.0.1 API_URL="http://localhost:$API_PORT" node server.js >"$OUT/logs/web-server.log" 2>&1) &
  PIDS+=($!)
  wait_for "http://localhost:$WEB_PORT/login" 60 || { echo "web did not come up on :$WEB_PORT"; return 1; }
}

echo "Report: $OUT"
step "Lint" make lint
step "Go unit + integration tests" go test -count=1 ./...
step "Web unit tests" bash -c "cd web && npx vitest run"
step "API + RADIUS load budgets" go test -tags perf -run TestPerf -count=1 -v ./cmd/api/
if [ "${SKIP_RADIUS_E2E:-}" = 1 ]; then skip "FreeRADIUS end to end" "SKIP_RADIUS_E2E=1"; else step "FreeRADIUS end to end" make e2e-radius; fi
step "Production web build" bash -c "cd web && npx next build"
step "JavaScript bundle budgets" bash -c "cd web && node scripts/bundle-budget.mjs"
if step "Start full stack" start_stack && [ "${STATUS[-1]}" = pass ]; then
  step "Browser e2e + Web Vitals" bash -c "cd web && BASE_URL=http://localhost:$WEB_PORT npx playwright test"
else
  skip "Browser e2e + Web Vitals" "stack did not start"
fi

{
  echo "# Verification report"
  echo
  echo "$(date -u '+%Y-%m-%d %H:%M UTC') · commit \`$(git rev-parse --short HEAD 2>/dev/null)\`$(git diff --quiet 2>/dev/null || echo ' (uncommitted changes)') · $(nproc 2>/dev/null) CPUs · budget scale ×$PERF_BUDGET_SCALE"
  echo
  echo "| Step | Result | Time |"
  echo "|---|---|--:|"
  for i in "${!NAMES[@]}"; do echo "| ${NAMES[$i]} | ${STATUS[$i]} | ${SECS[$i]} s |"; done
  for f in api-perf.md bundles.md web-perf.md; do [ -f "$OUT/$f" ] && { echo; cat "$OUT/$f"; }; done
  echo
  echo "Logs: \`logs/\`."
} >"$OUT/README.md"
rm -rf "$OUT/web" "$OUT/api"

echo
echo "Report: $OUT/README.md"
[ "$FAILED" = 0 ] && echo "All checks passed." || { echo "Some checks failed."; exit 1; }
