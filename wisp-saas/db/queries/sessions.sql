-- name: StartSession :one
INSERT INTO sessions (tenant_id, router_id, plan_id, access_type, username, acct_session_id, mac_address, ip_address)
VALUES (app_tenant(), $1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (router_id, acct_session_id) DO UPDATE SET status = 'active', updated_at = NOW()
RETURNING *;

-- name: UpdateSessionCounters :one
UPDATE sessions SET bytes_in = $3, bytes_out = $4, session_time_sec = $5, ip_address = COALESCE(sqlc.narg('ip')::inet, ip_address), updated_at = NOW()
WHERE router_id = $1 AND acct_session_id = $2
RETURNING *;

-- name: StopSession :exec
UPDATE sessions SET status = 'terminated', terminated_at = NOW(), termination_cause = $3,
    bytes_in = $4, bytes_out = $5, session_time_sec = $6, updated_at = NOW()
WHERE router_id = $1 AND acct_session_id = $2;

-- name: ActiveSessionsForUsername :many
SELECT s.*, r.tunnel_ip FROM sessions s JOIN routers r ON r.id = s.router_id
WHERE s.username = $1 AND s.status = 'active';

-- name: CountActiveSessions :many
SELECT access_type, count(*)::int AS n FROM sessions WHERE status = 'active' GROUP BY access_type;

-- name: CountActiveSessionsBetween :one
SELECT count(DISTINCT username)::int FROM sessions WHERE started_at < @at::timestamptz AND (terminated_at IS NULL OR terminated_at > @at::timestamptz);

-- name: BytesUsedSince :one
SELECT COALESCE(sum(bytes_in + bytes_out), 0)::bigint FROM sessions WHERE username = $1 AND started_at >= @since::timestamptz;

-- name: CloseStaleSessions :exec
UPDATE sessions SET status = 'terminated', terminated_at = NOW(), termination_cause = 'Stale'
WHERE status = 'active' AND updated_at < @before::timestamptz;
