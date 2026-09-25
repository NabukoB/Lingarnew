-- name: CreateLocation :one
INSERT INTO locations (tenant_id, name, address, lat, lng)
VALUES (app_tenant(), $1, $2, $3, $4)
RETURNING *;

-- name: ListLocations :many
SELECT * FROM locations ORDER BY created_at;

-- name: GetLocation :one
SELECT * FROM locations WHERE id = $1;

-- name: AllocateTunnelIP :one
SELECT allocate_tunnel_ip(@cidr::cidr)::inet AS ip;

-- name: CreateRouter :one
INSERT INTO routers (id, tenant_id, location_id, name, tunnel_ip, api_password_enc, radius_secret_enc)
VALUES ($1, app_tenant(), $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetRouter :one
SELECT * FROM routers WHERE id = $1;

-- name: ListRouters :many
SELECT r.*, l.name AS location_name,
       (SELECT count(*) FROM sessions s WHERE s.router_id = r.id AND s.status = 'active')::int AS active_sessions
FROM routers r JOIN locations l ON l.id = r.location_id
ORDER BY CASE r.status WHEN 'offline' THEN 0 WHEN 'degraded' THEN 1 WHEN 'misconfigured' THEN 2 WHEN 'pending' THEN 3 ELSE 4 END, r.name;

-- name: DeleteRouter :exec
DELETE FROM routers WHERE id = $1;

-- name: SetRouterPublicKey :exec
UPDATE routers SET wg_public_key = $2, updated_at = NOW() WHERE id = $1;

-- name: RecordRouterIdentity :exec
UPDATE routers SET serial_number = $2, board_name = $3, architecture = $4, firmware_version = $5, updated_at = NOW()
WHERE id = $1;

-- name: RecordPollSuccess :one
UPDATE routers SET
    missed_polls = 0,
    last_seen_at = NOW(),
    status_changed_at = CASE WHEN status <> 'online' THEN NOW() ELSE status_changed_at END,
    status = 'online',
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: RecordPollFailure :one
UPDATE routers SET
    missed_polls = missed_polls + 1,
    status = CASE
        WHEN status = 'pending' THEN 'pending'
        WHEN missed_polls + 1 >= @offline_after::int THEN 'offline'
        WHEN missed_polls + 1 >= @degraded_after::int THEN 'degraded'
        ELSE status END,
    status_changed_at = CASE
        WHEN status <> 'pending' AND status <> 'offline' AND missed_polls + 1 >= @offline_after::int THEN NOW()
        WHEN status = 'online' AND missed_polls + 1 >= @degraded_after::int THEN NOW()
        ELSE status_changed_at END,
    updated_at = NOW()
WHERE id = @id
RETURNING *;

-- name: MarkConfigPushed :exec
UPDATE routers SET last_config_push = NOW(), config_hash = $2, updated_at = NOW() WHERE id = $1;

-- name: SetRouterStatus :exec
UPDATE routers SET status = $2, status_changed_at = NOW(), updated_at = NOW() WHERE id = $1;

-- name: CreateOnboardingToken :exec
INSERT INTO onboarding_tokens (token_hash, tenant_id, router_id, expires_at) VALUES ($1, app_tenant(), $2, $3);

-- name: LookupOnboardingToken :one
SELECT t.tenant_id::uuid AS tenant_id, t.router_id::uuid AS router_id, t.expires_at::timestamptz AS expires_at, (t.used_at IS NOT NULL)::bool AS used FROM onboarding_token_lookup(@token_hash::bytea) t;

-- name: UseOnboardingToken :execrows
UPDATE onboarding_tokens SET used_at = NOW() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW();

-- name: RouterByTunnelIP :one
SELECT t.router_id::uuid AS router_id, t.tenant_id::uuid AS tenant_id FROM router_by_tunnel_ip(@ip::inet) t;

-- name: RouterTargets :many
SELECT t.router_id::uuid AS router_id, t.tenant_id::uuid AS tenant_id FROM router_targets() t;

-- name: WireguardPeers :many
SELECT t.router_id::uuid AS router_id, t.public_key::text AS public_key, t.tunnel_ip::inet AS tunnel_ip FROM wireguard_peers() t;

-- name: InsertConfigAudit :exec
INSERT INTO config_audit (tenant_id, router_id, action, payload, status, error_message, initiated_by)
VALUES (app_tenant(), $1, $2, $3, $4, $5, $6);

-- name: ListConfigAudit :many
SELECT * FROM config_audit WHERE router_id = $1 ORDER BY created_at DESC LIMIT $2;
