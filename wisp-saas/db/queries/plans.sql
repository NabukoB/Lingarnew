-- name: CreatePlan :one
INSERT INTO plans (tenant_id, location_id, name, access_type, price_cents, duration_days, duration_minutes, is_trial,
                   data_cap_mb, bandwidth_down_kbps, bandwidth_up_kbps, max_devices, mikrotik_profile_name, sort_order)
VALUES (app_tenant(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
RETURNING *;

-- name: UpdatePlan :one
UPDATE plans SET name = $2, price_cents = $3, duration_days = $4, duration_minutes = $5, data_cap_mb = $6,
    bandwidth_down_kbps = $7, bandwidth_up_kbps = $8, max_devices = $9, is_active = $10, sort_order = $11
WHERE id = $1
RETURNING *;

-- name: GetPlan :one
SELECT * FROM plans WHERE id = $1;

-- name: ListPlans :many
SELECT * FROM plans
WHERE (sqlc.narg('access_type')::text IS NULL OR access_type = sqlc.narg('access_type')::text)
ORDER BY access_type, sort_order, price_cents;

-- name: ListActiveHotspotPlans :many
SELECT * FROM plans WHERE access_type = 'hotspot' AND is_active ORDER BY is_trial DESC, sort_order, price_cents;
