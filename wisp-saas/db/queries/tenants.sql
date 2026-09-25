-- name: CreateTenant :one
INSERT INTO tenants (id, email, password_hash, name, slug, account_prefix, callback_token, dek_wrapped,
                     support_phone, mpesa_shortcode_type, mpesa_shortcode)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: GetTenant :one
SELECT * FROM tenants WHERE id = app_tenant();

-- name: UpdateTenantSettings :one
UPDATE tenants SET
    name = $1,
    support_phone = $2,
    mpesa_mode = $3,
    mpesa_shortcode_type = $4,
    mpesa_shortcode = $5,
    mpesa_store_number = $6,
    mpesa_env = $7,
    primary_color = $8,
    logo_url = $9,
    portal_domain = $10,
    grace_hours = $11,
    reminder_sms_enabled = $12,
    hotspot_expiry_sms_enabled = $13,
    hotspot_expiry_sms_template = $14,
    sms_sender = $15,
    timezone = $16,
    updated_at = NOW()
WHERE id = app_tenant()
RETURNING *;

-- name: SetTenantMpesaCredentials :exec
UPDATE tenants SET mpesa_credentials_enc = $1, updated_at = NOW() WHERE id = app_tenant();

-- name: SetTenantPassword :exec
UPDATE tenants SET password_hash = $1, updated_at = NOW() WHERE id = app_tenant();

-- name: SetTenantAccountPrefix :exec
UPDATE tenants SET account_prefix = $1, updated_at = NOW() WHERE id = app_tenant();

-- name: NextAccountNumber :one
UPDATE tenants SET next_account_no = next_account_no + 1
WHERE id = app_tenant()
RETURNING account_prefix, (next_account_no - 1)::int AS account_no;

-- name: AddSMSCredits :one
UPDATE tenants SET sms_credits = sms_credits + @credits::int WHERE id = app_tenant() RETURNING sms_credits;

-- name: TakeSMSCredits :one
UPDATE tenants SET sms_credits = sms_credits - @credits::int
WHERE id = app_tenant() AND sms_credits >= @credits::int
RETURNING sms_credits;

-- name: SetSubscription :exec
UPDATE tenants SET subscription_status = $1, subscription_expires_at = $2, updated_at = NOW() WHERE id = app_tenant();

-- name: CreateAuthSession :exec
INSERT INTO auth_sessions (token_hash, tenant_id, expires_at) VALUES ($1, app_tenant(), $2);

-- name: DeleteAuthSession :exec
DELETE FROM auth_sessions WHERE token_hash = $1;

-- name: DeleteExpiredAuthSessions :exec
DELETE FROM auth_sessions WHERE expires_at < NOW();

-- name: TenantLogin :one
SELECT t.tenant_id::uuid AS tenant_id, t.password_hash::text AS password_hash FROM tenant_login(@email::text) t;

-- name: AuthSessionTenant :one
SELECT auth_session_tenant(@token_hash::bytea)::uuid AS tenant_id;

-- name: TenantBySlug :one
SELECT t.tenant_id::uuid AS tenant_id, t.callback_token::text AS callback_token FROM tenant_by_slug(@slug::text) t;

-- name: TenantByPortalDomain :one
SELECT tenant_by_portal_domain(@domain::text)::uuid AS tenant_id;

-- name: TenantIdentityTaken :one
SELECT t.email_taken::bool AS email_taken, t.slug_taken::bool AS slug_taken, t.prefix_taken::bool AS prefix_taken FROM tenant_identity_taken(@email::text, @slug::text, @prefix::text) t;

-- name: ActiveTenantIDs :many
SELECT active_tenant_ids()::uuid AS tenant_id;
