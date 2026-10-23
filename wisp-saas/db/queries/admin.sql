-- Platform admin console. These run only on the ADMIN_DATABASE_URL pool
-- (role wisp_platform); on the app pool they see nothing.

-- name: AdminByEmail :one
SELECT id, email, name, password_hash, totp_secret_enc, dek_wrapped, totp_last_step, disabled_at
FROM platform_admins WHERE lower(email) = lower(@email);

-- name: CreatePlatformAdmin :exec
INSERT INTO platform_admins (id, email, name, password_hash, totp_secret_enc, dek_wrapped)
VALUES (@id, @email, @name, @password_hash, @totp_secret_enc, @dek_wrapped);

-- name: UseTOTPStep :execrows
-- Accepts a code's time step once; replays of the same or older steps match no row.
UPDATE platform_admins SET totp_last_step = @step, last_login_at = NOW()
WHERE id = @id AND totp_last_step < @step AND disabled_at IS NULL;

-- name: CreateAdminSession :exec
INSERT INTO admin_sessions (token_hash, admin_id, ip, expires_at) VALUES (@token_hash, @admin_id, @ip, @expires_at);

-- name: AdminBySession :one
SELECT a.id, a.email, a.name FROM admin_sessions s JOIN platform_admins a ON a.id = s.admin_id
WHERE s.token_hash = @token_hash AND s.expires_at > NOW() AND a.disabled_at IS NULL;

-- name: DeleteAdminSession :exec
DELETE FROM admin_sessions WHERE token_hash = @token_hash;

-- name: InsertAdminAudit :exec
INSERT INTO admin_audit (admin_id, action, tenant_id, payload) VALUES (@admin_id, @action, @tenant_id, @payload);

-- name: ListAdminAudit :many
SELECT l.id, l.action, l.tenant_id, l.payload, l.created_at, a.email AS admin_email, t.name AS tenant_name
FROM admin_audit l
JOIN platform_admins a ON a.id = l.admin_id
LEFT JOIN tenants t ON t.id = l.tenant_id
WHERE (sqlc.narg(tenant_id)::uuid IS NULL OR l.tenant_id = sqlc.narg(tenant_id)::uuid)
ORDER BY l.created_at DESC
LIMIT @lim;

-- name: AdminTenants :many
SELECT t.id, t.name, t.email, t.slug, t.plan, t.mpesa_mode, t.subscription_status, t.trial_ends_at,
       t.subscription_expires_at, t.sms_credits, t.created_at,
       (SELECT count(*) FROM routers r WHERE r.tenant_id = t.id)::int AS routers,
       (SELECT count(*) FROM routers r WHERE r.tenant_id = t.id AND r.status = 'online')::int AS routers_online,
       (SELECT count(*) FROM routers r WHERE r.tenant_id = t.id AND r.status = 'offline')::int AS routers_offline,
       (SELECT count(*) FROM subscribers s WHERE s.tenant_id = t.id AND s.status = 'active')::int AS active_subscribers,
       (SELECT max(a.created_at) FROM auth_sessions a WHERE a.tenant_id = t.id)::timestamptz AS last_login_at
FROM tenants t
WHERE (@q::text = '' OR t.name ILIKE '%' || @q || '%' OR t.email ILIKE '%' || @q || '%' OR t.slug ILIKE '%' || @q || '%')
ORDER BY t.created_at DESC
LIMIT @lim;

-- name: AdminTenant :one
SELECT t.id, t.name, t.email, t.slug, t.account_prefix, t.plan, t.mpesa_mode, t.mpesa_shortcode_type, t.mpesa_shortcode,
       t.mpesa_env, t.support_phone, t.portal_domain, t.timezone, t.subscription_status, t.trial_ends_at,
       t.subscription_expires_at, t.sms_credits, t.created_at,
       (SELECT count(*) FROM subscribers s WHERE s.tenant_id = t.id)::int AS subscribers,
       (SELECT count(*) FROM subscribers s WHERE s.tenant_id = t.id AND s.status = 'active')::int AS active_subscribers,
       (SELECT max(a.created_at) FROM auth_sessions a WHERE a.tenant_id = t.id)::timestamptz AS last_login_at
FROM tenants t WHERE t.id = @id;

-- name: AdminTenantRouters :many
SELECT r.id, r.name, r.status, r.status_changed_at, r.last_seen_at, r.board_name, r.firmware_version, l.name AS location
FROM routers r JOIN locations l ON l.id = r.location_id
WHERE r.tenant_id = @tenant_id ORDER BY r.name;

-- name: AdminTenantPlatformPayments :many
SELECT id, purpose, amount_cents, status, mpesa_receipt_number, created_at
FROM mpesa_transactions
WHERE tenant_id = @tenant_id AND purpose IN ('platform_subscription', 'sms_credits')
ORDER BY created_at DESC LIMIT 20;

-- name: AdminTenantMoney :one
-- What the WISP's own customers paid in the last 30 days (success only), in cents.
SELECT COALESCE(sum(amount_cents), 0)::bigint AS cents, count(*)::int AS payments
FROM mpesa_transactions
WHERE tenant_id = @tenant_id AND status = 'success' AND purpose NOT IN ('platform_subscription', 'sms_credits')
  AND created_at >= NOW() - INTERVAL '30 days';

-- name: AdminCounts :one
SELECT
    (SELECT count(*) FROM tenants)::int AS tenants,
    (SELECT count(*) FROM tenants WHERE subscription_status = 'trial' AND trial_ends_at > NOW())::int AS on_trial,
    (SELECT count(*) FROM tenants WHERE subscription_status = 'trial' AND trial_ends_at > NOW() AND trial_ends_at < NOW() + INTERVAL '7 days')::int AS trials_ending,
    (SELECT count(*) FROM tenants WHERE subscription_status = 'active' AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW()))::int AS paying,
    (SELECT count(*) FROM tenants WHERE subscription_status = 'lapsed'
        OR (subscription_status = 'trial' AND trial_ends_at <= NOW())
        OR (subscription_status = 'active' AND subscription_expires_at <= NOW()))::int AS lapsed,
    (SELECT count(*) FROM routers)::int AS routers,
    (SELECT count(*) FROM routers WHERE status = 'online')::int AS routers_online,
    (SELECT count(*) FROM routers WHERE status = 'offline')::int AS routers_offline,
    (SELECT count(*) FROM subscribers WHERE status = 'active')::int AS active_subscribers,
    (SELECT count(*) FROM mpesa_transactions WHERE status = 'pending' AND created_at < NOW() - INTERVAL '10 minutes')::int AS stuck_payments,
    (SELECT count(*) FROM mpesa_transactions WHERE status = 'unmatched')::int AS unmatched_payments,
    (SELECT count(*) FROM sms_messages WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours')::int AS failed_sms,
    (SELECT COALESCE(sum(questions), 0) FROM assistant_usage WHERE day = (NOW() AT TIME ZONE 'Africa/Nairobi')::date)::int AS assistant_questions;

-- name: AdminPlatformIncome :many
-- Our own income (subscriptions + SMS credits) per day, in cents.
SELECT (created_at AT TIME ZONE 'Africa/Nairobi')::date AS day, purpose, COALESCE(sum(amount_cents), 0)::bigint AS cents
FROM mpesa_transactions
WHERE purpose IN ('platform_subscription', 'sms_credits') AND status = 'success' AND created_at >= @since
GROUP BY 1, 2 ORDER BY 1;

-- name: AdminOfflineRouters :many
SELECT r.id, r.name, r.status_changed_at, t.id AS tenant_id, t.name AS tenant_name
FROM routers r JOIN tenants t ON t.id = r.tenant_id
WHERE r.status = 'offline' ORDER BY r.status_changed_at LIMIT 20;

-- name: AdminExtendTrial :one
UPDATE tenants SET
    trial_ends_at = GREATEST(trial_ends_at, NOW()) + make_interval(days => @days::int),
    subscription_status = 'trial',
    updated_at = NOW()
WHERE id = @id AND subscription_status <> 'active'
RETURNING id, subscription_status, trial_ends_at;

-- name: AdminAddSubscription :one
UPDATE tenants SET
    subscription_status = 'active',
    subscription_expires_at = GREATEST(COALESCE(subscription_expires_at, NOW()), NOW()) + make_interval(months => @months::int),
    updated_at = NOW()
WHERE id = @id
RETURNING id, subscription_status, subscription_expires_at;

-- name: AdminGrantSMSCredits :one
UPDATE tenants SET sms_credits = sms_credits + @credits::int, updated_at = NOW()
WHERE id = @id
RETURNING id, sms_credits;
