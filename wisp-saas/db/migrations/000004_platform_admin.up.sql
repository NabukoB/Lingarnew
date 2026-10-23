-- Platform admin console. Our staff sign in with a password + authenticator
-- code; the console connects as a login role in wisp_platform
-- (ADMIN_DATABASE_URL). wisp_platform is the only role that can read across
-- tenants, and only the columns the console needs: never password hashes,
-- wrapped keys, M-Pesa credentials, callback tokens or PPPoE passwords.
-- The API's wisp_app role gains nothing here.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wisp_platform') THEN
        CREATE ROLE wisp_platform NOLOGIN;
    END IF;
END
$$;

CREATE TABLE platform_admins (
    id                  UUID PRIMARY KEY,
    email               TEXT NOT NULL,
    name                TEXT NOT NULL,
    password_hash       TEXT NOT NULL,
    totp_secret_enc     BYTEA NOT NULL,      -- sealed with this admin's own data key (internal/secrets)
    dek_wrapped         BYTEA NOT NULL,
    totp_last_step      BIGINT NOT NULL DEFAULT 0,  -- a code can be used once
    disabled_at         TIMESTAMPTZ,
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX platform_admins_email_key ON platform_admins (lower(email));

CREATE TABLE admin_sessions (
    token_hash  BYTEA PRIMARY KEY,
    admin_id    UUID NOT NULL REFERENCES platform_admins(id) ON DELETE CASCADE,
    ip          TEXT,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX admin_sessions_admin ON admin_sessions (admin_id);

CREATE TABLE admin_audit (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id    UUID NOT NULL REFERENCES platform_admins(id),
    action      TEXT NOT NULL,          -- LOGIN, EXTEND_TRIAL, SET_SUBSCRIPTION, GRANT_SMS_CREDITS, ...
    tenant_id   UUID REFERENCES tenants(id) ON DELETE SET NULL,
    payload     JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX admin_audit_created ON admin_audit (created_at DESC);
CREATE INDEX admin_audit_tenant ON admin_audit (tenant_id, created_at DESC);

-- Staff tables: wisp_platform only.
REVOKE ALL ON platform_admins, admin_sessions, admin_audit FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON platform_admins TO wisp_platform;
GRANT SELECT, INSERT, DELETE ON admin_sessions TO wisp_platform;
GRANT SELECT, INSERT ON admin_audit TO wisp_platform;

-- Cross-tenant read access, column by column where a table holds secrets.
GRANT SELECT (id, email, name, slug, account_prefix, plan, mpesa_mode, mpesa_shortcode_type, mpesa_shortcode, mpesa_env,
              sms_credits, support_phone, subscription_status, trial_ends_at, subscription_expires_at, portal_domain,
              timezone, created_at, updated_at) ON tenants TO wisp_platform;
GRANT UPDATE (subscription_status, trial_ends_at, subscription_expires_at, sms_credits, updated_at) ON tenants TO wisp_platform;
GRANT SELECT (id, tenant_id, status, next_renewal_at, created_at) ON subscribers TO wisp_platform;
GRANT SELECT (id, tenant_id, location_id, name, status, status_changed_at, last_seen_at, board_name, firmware_version, created_at)
    ON routers TO wisp_platform;
GRANT SELECT (tenant_id, created_at) ON auth_sessions TO wisp_platform;
-- No end-customer phone numbers or SMS bodies.
GRANT SELECT (id, tenant_id, source, purpose, mpesa_receipt_number, amount_cents, status, result_code, result_desc,
              created_at, updated_at) ON mpesa_transactions TO wisp_platform;
GRANT SELECT (id, tenant_id, kind, status, credits, error_message, created_at) ON sms_messages TO wisp_platform;
GRANT SELECT ON locations, plans, config_audit, router_metrics, assistant_usage TO wisp_platform;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['tenants', 'subscribers', 'routers', 'auth_sessions', 'locations', 'plans', 'mpesa_transactions',
                             'sms_messages', 'config_audit', 'router_metrics', 'assistant_usage']
    LOOP
        EXECUTE format('CREATE POLICY platform_read ON %I FOR SELECT TO wisp_platform USING (true)', t);
    END LOOP;
END
$$;
CREATE POLICY platform_write ON tenants FOR UPDATE TO wisp_platform USING (true) WITH CHECK (true);
