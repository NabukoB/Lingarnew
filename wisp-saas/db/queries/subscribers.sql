-- name: CreateSubscriber :one
INSERT INTO subscribers (id, tenant_id, location_id, full_name, phone_number, email, physical_address,
                         pppoe_username, pppoe_password_enc, plan_id, next_renewal_at, status)
VALUES ($1, app_tenant(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: GetSubscriber :one
SELECT * FROM subscribers WHERE id = $1;

-- name: GetSubscriberForUpdate :one
SELECT * FROM subscribers WHERE id = $1 FOR UPDATE;

-- name: GetSubscriberByUsername :one
SELECT * FROM subscribers WHERE pppoe_username = upper(trim(@username::text));

-- name: ListSubscribers :many
SELECT s.*, p.name AS plan_name, p.price_cents AS plan_price_cents,
       EXISTS (SELECT 1 FROM sessions x WHERE x.username = s.pppoe_username AND x.status = 'active') AS online
FROM subscribers s LEFT JOIN plans p ON p.id = s.plan_id
WHERE (sqlc.narg('status')::text IS NULL OR s.status = sqlc.narg('status')::text)
  AND (sqlc.narg('q')::text IS NULL
       OR s.full_name ILIKE '%' || sqlc.narg('q')::text || '%'
       OR s.pppoe_username ILIKE '%' || sqlc.narg('q')::text || '%'
       OR s.phone_number LIKE '%' || sqlc.narg('q')::text || '%')
ORDER BY s.created_at DESC
LIMIT $1 OFFSET $2;

-- name: CountSubscribersByStatus :many
SELECT status, count(*)::int AS n FROM subscribers GROUP BY status;

-- name: UpdateSubscriber :one
UPDATE subscribers SET full_name = $2, phone_number = $3, email = $4, physical_address = $5, location_id = $6,
    plan_id = $7, auto_renew = $8, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: SetSubscriberStatus :exec
UPDATE subscribers SET status = $2, updated_at = NOW() WHERE id = $1;

-- name: SetSubscriberPassword :exec
UPDATE subscribers SET pppoe_password_enc = $2, updated_at = NOW() WHERE id = $1;

-- name: ApplySubscriberPayment :one
UPDATE subscribers SET next_renewal_at = $2, credit_cents = $3, status = $4, reminder_stage = 0, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ListExpiredActive :many
-- Active accounts whose paid period plus the tenant's grace period is over.
SELECT * FROM subscribers
WHERE status = 'active' AND next_renewal_at IS NOT NULL
  AND next_renewal_at + make_interval(hours => @grace_hours::int) <= NOW();

-- name: ListReminderCandidates :many
SELECT s.*, p.price_cents AS plan_price_cents, p.name AS plan_name FROM subscribers s LEFT JOIN plans p ON p.id = s.plan_id
WHERE s.status = 'active' AND s.next_renewal_at IS NOT NULL
  AND ((s.reminder_stage < 1 AND s.next_renewal_at <= NOW() + INTERVAL '3 days' AND s.next_renewal_at > NOW() + INTERVAL '1 day')
    OR (s.reminder_stage < 2 AND s.next_renewal_at <= NOW() + INTERVAL '1 day' AND s.next_renewal_at > NOW()));

-- name: SetReminderStage :exec
UPDATE subscribers SET reminder_stage = $2 WHERE id = $1;

-- name: CountRenewalsDue :one
SELECT count(*)::int FROM subscribers WHERE status = 'active' AND next_renewal_at BETWEEN NOW() AND NOW() + INTERVAL '3 days';

-- name: OnTimeRate :one
SELECT count(*) FILTER (WHERE status = 'active')::int AS on_time, count(*) FILTER (WHERE status IN ('active', 'expired', 'suspended'))::int AS total
FROM subscribers;
