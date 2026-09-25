-- WISP SaaS schema. Every tenant-scoped table has row-level security keyed on
-- app.current_tenant_id, which the API sets with SET LOCAL inside each transaction.
-- The API connects as a login role that is a member of wisp_app (never the owner),
-- so RLS always applies to it.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wisp_app') THEN
        CREATE ROLE wisp_app NOLOGIN;
    END IF;
END
$$;

CREATE FUNCTION app_tenant() RETURNS uuid
    LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid $$;

-- ═══════════════════════════════════════════════════════
-- TENANTS (WISPs)
-- ═══════════════════════════════════════════════════════
CREATE TABLE tenants (
    id                          UUID PRIMARY KEY,
    email                       TEXT NOT NULL,
    password_hash               TEXT NOT NULL,
    name                        TEXT NOT NULL,
    slug                        TEXT NOT NULL,
    account_prefix              TEXT NOT NULL CHECK (account_prefix ~ '^[A-Z]{2,4}$'),
    next_account_no             INTEGER NOT NULL DEFAULT 1000,
    plan                        TEXT NOT NULL DEFAULT 'starter',

    mpesa_mode                  TEXT NOT NULL DEFAULT 'platform' CHECK (mpesa_mode IN ('platform', 'own')),
    mpesa_shortcode_type        TEXT NOT NULL DEFAULT 'till' CHECK (mpesa_shortcode_type IN ('till', 'paybill')),
    mpesa_shortcode             TEXT,
    mpesa_store_number          TEXT,      -- Buy Goods head-office number when it differs from the till
    mpesa_credentials_enc       BYTEA,     -- own mode only; see internal/secrets
    mpesa_env                   TEXT NOT NULL DEFAULT 'sandbox' CHECK (mpesa_env IN ('sandbox', 'production')),
    callback_token              TEXT NOT NULL,
    dek_wrapped                 BYTEA NOT NULL,

    sms_credits                 INTEGER NOT NULL DEFAULT 0 CHECK (sms_credits >= 0),
    sms_sender                  TEXT,
    reminder_sms_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
    hotspot_expiry_sms_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
    hotspot_expiry_sms_template TEXT,
    support_phone               TEXT,

    subscription_status         TEXT NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'lapsed')),
    trial_ends_at               TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '14 days',
    subscription_expires_at     TIMESTAMPTZ,
    grace_hours                 INTEGER NOT NULL DEFAULT 0 CHECK (grace_hours BETWEEN 0 AND 168),

    portal_domain               TEXT,
    logo_url                    TEXT,
    primary_color               TEXT NOT NULL DEFAULT '#2563eb' CHECK (primary_color ~ '^#[0-9a-fA-F]{6}$'),
    timezone                    TEXT NOT NULL DEFAULT 'Africa/Nairobi',
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX tenants_email_key ON tenants (lower(email));
CREATE UNIQUE INDEX tenants_slug_key ON tenants (slug);
CREATE UNIQUE INDEX tenants_prefix_key ON tenants (account_prefix);
CREATE UNIQUE INDEX tenants_portal_domain_key ON tenants (lower(portal_domain)) WHERE portal_domain IS NOT NULL;

CREATE TABLE auth_sessions (
    token_hash  BYTEA PRIMARY KEY,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX auth_sessions_tenant ON auth_sessions (tenant_id);

-- ═══════════════════════════════════════════════════════
-- LOCATIONS + ROUTERS
-- ═══════════════════════════════════════════════════════
CREATE TABLE locations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    address     TEXT,
    lat         DOUBLE PRECISION,
    lng         DOUBLE PRECISION,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX locations_tenant ON locations (tenant_id);

CREATE TABLE routers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    location_id         UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,

    serial_number       TEXT,
    board_name          TEXT,
    architecture        TEXT,
    firmware_version    TEXT,

    tunnel_ip           INET NOT NULL UNIQUE,
    wg_public_key       TEXT UNIQUE,
    api_user            TEXT NOT NULL DEFAULT 'wisp-api',
    api_password_enc    BYTEA NOT NULL,
    radius_secret_enc   BYTEA NOT NULL,

    status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'online', 'degraded', 'offline', 'misconfigured')),
    missed_polls        INTEGER NOT NULL DEFAULT 0,
    last_seen_at        TIMESTAMPTZ,
    status_changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_config_push    TIMESTAMPTZ,
    config_hash         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX routers_tenant ON routers (tenant_id);
CREATE INDEX routers_location ON routers (location_id);
CREATE INDEX routers_status ON routers (status);

CREATE TABLE onboarding_tokens (
    token_hash  BYTEA PRIMARY KEY,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    router_id   UUID NOT NULL REFERENCES routers(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX onboarding_tokens_router ON onboarding_tokens (router_id);

-- ═══════════════════════════════════════════════════════
-- PLANS + SUBSCRIBERS
-- ═══════════════════════════════════════════════════════
CREATE TABLE plans (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    location_id             UUID REFERENCES locations(id) ON DELETE SET NULL,
    name                    TEXT NOT NULL,
    access_type             TEXT NOT NULL CHECK (access_type IN ('pppoe', 'hotspot')),
    price_cents             INTEGER NOT NULL CHECK (price_cents >= 0),
    currency                TEXT NOT NULL DEFAULT 'KES',
    duration_days           INTEGER CHECK (duration_days > 0),
    duration_minutes        INTEGER CHECK (duration_minutes > 0),
    is_trial                BOOLEAN NOT NULL DEFAULT FALSE,
    data_cap_mb             BIGINT CHECK (data_cap_mb > 0),
    bandwidth_down_kbps     INTEGER NOT NULL CHECK (bandwidth_down_kbps > 0),
    bandwidth_up_kbps       INTEGER NOT NULL CHECK (bandwidth_up_kbps > 0),
    max_devices             INTEGER NOT NULL DEFAULT 1 CHECK (max_devices BETWEEN 1 AND 20),
    mikrotik_profile_name   TEXT,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order              INTEGER NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (access_type <> 'hotspot' OR duration_minutes IS NOT NULL),
    CHECK (access_type <> 'pppoe' OR duration_days IS NOT NULL)
);
CREATE INDEX plans_tenant ON plans (tenant_id, is_active);

CREATE TABLE subscribers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    location_id         UUID REFERENCES locations(id) ON DELETE SET NULL,
    full_name           TEXT NOT NULL,
    phone_number        TEXT NOT NULL CHECK (phone_number ~ '^254[17][0-9]{8}$'),
    email               TEXT,
    physical_address    TEXT,
    -- System-generated account ID: tenants.account_prefix + sequence, e.g. JZM1042.
    -- It is the PPPoE username and the M-Pesa account number. Never reused or changed.
    pppoe_username      TEXT NOT NULL UNIQUE CHECK (pppoe_username ~ '^[A-Z]{2,4}[0-9]{3,7}$'),
    pppoe_password_enc  BYTEA NOT NULL,
    status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'cancelled')),
    plan_id             UUID REFERENCES plans(id) ON DELETE SET NULL,
    next_renewal_at     TIMESTAMPTZ,
    credit_cents        INTEGER NOT NULL DEFAULT 0 CHECK (credit_cents >= 0),
    auto_renew          BOOLEAN NOT NULL DEFAULT TRUE,
    reminder_stage      INTEGER NOT NULL DEFAULT 0,  -- 0 none, 1 = 3-day sent, 2 = 1-day sent
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX subscribers_tenant ON subscribers (tenant_id, status);
CREATE INDEX subscribers_phone ON subscribers (tenant_id, phone_number);
CREATE INDEX subscribers_renewal ON subscribers (next_renewal_at) WHERE status IN ('active', 'expired');

-- ═══════════════════════════════════════════════════════
-- HOTSPOT
-- ═══════════════════════════════════════════════════════
CREATE TABLE vouchers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id         UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    code            TEXT NOT NULL CHECK (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
    batch           TEXT,
    redeemed_at     TIMESTAMPTZ,
    redeemed_mac    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, code)
);

CREATE TABLE hotspot_purchases (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    router_id               UUID REFERENCES routers(id) ON DELETE SET NULL,
    plan_id                 UUID NOT NULL REFERENCES plans(id),
    source                  TEXT NOT NULL CHECK (source IN ('mpesa', 'voucher', 'trial')),
    phone_number            TEXT,
    mpesa_receipt_number    TEXT,
    voucher_id              UUID REFERENCES vouchers(id),
    macs                    TEXT[] NOT NULL DEFAULT '{}',
    max_devices             INTEGER NOT NULL DEFAULT 1,
    starts_at               TIMESTAMPTZ,   -- NULL while the STK Push is pending
    expires_at              TIMESTAMPTZ,
    expiry_sms_sent_at      TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX hotspot_purchases_tenant ON hotspot_purchases (tenant_id, created_at DESC);
CREATE INDEX hotspot_purchases_receipt ON hotspot_purchases (tenant_id, mpesa_receipt_number);
CREATE INDEX hotspot_purchases_macs ON hotspot_purchases USING GIN (macs);
CREATE INDEX hotspot_purchases_expiry ON hotspot_purchases (expires_at) WHERE expiry_sms_sent_at IS NULL;

-- ═══════════════════════════════════════════════════════
-- M-PESA
-- ═══════════════════════════════════════════════════════
CREATE TABLE mpesa_transactions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source                  TEXT NOT NULL CHECK (source IN ('stk', 'c2b')),
    purpose                 TEXT NOT NULL DEFAULT 'customer' CHECK (purpose IN ('customer', 'platform_subscription', 'sms_credits')),
    merchant_request_id     TEXT UNIQUE,
    checkout_request_id     TEXT UNIQUE,
    mpesa_receipt_number    TEXT UNIQUE,
    phone_number            TEXT,
    amount_cents            INTEGER NOT NULL CHECK (amount_cents >= 0),
    account_reference       TEXT NOT NULL,
    transaction_desc        TEXT,
    status                  TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'expired', 'unmatched')),
    result_code             INTEGER,
    result_desc             TEXT,
    callback_received_at    TIMESTAMPTZ,
    subscriber_id           UUID REFERENCES subscribers(id) ON DELETE SET NULL,
    hotspot_purchase_id     UUID REFERENCES hotspot_purchases(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX mpesa_tenant ON mpesa_transactions (tenant_id, created_at DESC);
CREATE INDEX mpesa_pending ON mpesa_transactions (created_at) WHERE status = 'pending';
CREATE INDEX mpesa_subscriber ON mpesa_transactions (subscriber_id);

-- ═══════════════════════════════════════════════════════
-- RADIUS SESSIONS
-- ═══════════════════════════════════════════════════════
CREATE TABLE sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    router_id           UUID NOT NULL REFERENCES routers(id) ON DELETE CASCADE,
    plan_id             UUID REFERENCES plans(id) ON DELETE SET NULL,
    access_type         TEXT NOT NULL CHECK (access_type IN ('pppoe', 'hotspot')),
    username            TEXT NOT NULL,
    acct_session_id     TEXT NOT NULL,
    mac_address         TEXT,
    ip_address          INET,
    status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'terminated')),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    terminated_at       TIMESTAMPTZ,
    termination_cause   TEXT,
    bytes_in            BIGINT NOT NULL DEFAULT 0,
    bytes_out           BIGINT NOT NULL DEFAULT 0,
    session_time_sec    INTEGER NOT NULL DEFAULT 0,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (router_id, acct_session_id)
);
CREATE INDEX sessions_active ON sessions (tenant_id, status) WHERE status = 'active';
CREATE INDEX sessions_username ON sessions (tenant_id, username, status);

-- ═══════════════════════════════════════════════════════
-- AUDIT + SMS
-- ═══════════════════════════════════════════════════════
CREATE TABLE config_audit (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    router_id       UUID REFERENCES routers(id) ON DELETE SET NULL,
    action          TEXT NOT NULL,
    payload         JSONB NOT NULL DEFAULT '{}',
    status          TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
    error_message   TEXT,
    initiated_by    TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX config_audit_router ON config_audit (tenant_id, router_id, created_at DESC);

CREATE TABLE sms_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    to_number       TEXT NOT NULL,
    body            TEXT NOT NULL,
    kind            TEXT NOT NULL,
    status          TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped_no_credit')),
    credits         INTEGER NOT NULL DEFAULT 0,
    provider_id     TEXT,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX sms_tenant ON sms_messages (tenant_id, created_at DESC);

-- ═══════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_self ON tenants USING (id = app_tenant()) WITH CHECK (id = app_tenant());

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['auth_sessions', 'locations', 'routers', 'onboarding_tokens', 'plans', 'subscribers',
                             'vouchers', 'hotspot_purchases', 'mpesa_transactions', 'sessions', 'config_audit', 'sms_messages']
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id = app_tenant()) WITH CHECK (tenant_id = app_tenant())', t);
    END LOOP;
END
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wisp_app;
GRANT EXECUTE ON FUNCTION app_tenant() TO wisp_app;

-- ═══════════════════════════════════════════════════════
-- LOOKUPS BEFORE THE TENANT IS KNOWN
-- SECURITY DEFINER functions that return only what the caller needs to
-- set app.current_tenant_id. They never return other tenants' rows.
-- ═══════════════════════════════════════════════════════
CREATE FUNCTION tenant_login(p_email TEXT)
    RETURNS TABLE (tenant_id UUID, password_hash TEXT)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id, password_hash FROM tenants WHERE lower(email) = lower(p_email) $$;

CREATE FUNCTION auth_session_tenant(p_hash BYTEA)
    RETURNS UUID
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT tenant_id FROM auth_sessions WHERE token_hash = p_hash AND expires_at > NOW() $$;

CREATE FUNCTION tenant_by_slug(p_slug TEXT)
    RETURNS TABLE (tenant_id UUID, callback_token TEXT)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id, callback_token FROM tenants WHERE slug = p_slug $$;

CREATE FUNCTION tenant_by_portal_domain(p_domain TEXT)
    RETURNS UUID
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM tenants WHERE lower(portal_domain) = lower(p_domain) $$;

CREATE FUNCTION tenant_identity_taken(p_email TEXT, p_slug TEXT, p_prefix TEXT)
    RETURNS TABLE (email_taken BOOLEAN, slug_taken BOOLEAN, prefix_taken BOOLEAN)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (SELECT 1 FROM tenants WHERE lower(email) = lower(p_email)),
           EXISTS (SELECT 1 FROM tenants WHERE slug = p_slug),
           EXISTS (SELECT 1 FROM tenants WHERE account_prefix = p_prefix)
$$;

CREATE FUNCTION router_by_tunnel_ip(p_ip INET)
    RETURNS TABLE (router_id UUID, tenant_id UUID)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id, tenant_id FROM routers WHERE tunnel_ip = p_ip $$;

CREATE FUNCTION onboarding_token_lookup(p_hash BYTEA)
    RETURNS TABLE (tenant_id UUID, router_id UUID, expires_at TIMESTAMPTZ, used_at TIMESTAMPTZ)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT tenant_id, router_id, expires_at, used_at FROM onboarding_tokens WHERE token_hash = p_hash $$;

-- Lowest free host address in the tunnel CIDR (.1 is the WireGuard server).
-- Holds a transaction-scoped advisory lock so concurrent allocations serialise
-- until the caller's INSERT commits.
CREATE FUNCTION allocate_tunnel_ip(p_cidr CIDR)
    RETURNS INET
    LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    base BIGINT := (host(network(p_cidr))::inet - '0.0.0.0'::inet);
    size BIGINT := (2::BIGINT ^ (32 - masklen(p_cidr)))::BIGINT;
    candidate INET;
BEGIN
    PERFORM pg_advisory_xact_lock(7340031);
    SELECT ('0.0.0.0'::inet + (base + n)) INTO candidate
    FROM generate_series(2, size - 2) AS n
    WHERE NOT EXISTS (SELECT 1 FROM routers r WHERE r.tunnel_ip = ('0.0.0.0'::inet + (base + n)))
    ORDER BY n
    LIMIT 1;
    IF candidate IS NULL THEN
        RAISE EXCEPTION 'tunnel address pool % is full', p_cidr;
    END IF;
    RETURN candidate;
END
$$;

CREATE FUNCTION active_tenant_ids()
    RETURNS SETOF UUID
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM tenants ORDER BY created_at $$;

CREATE FUNCTION router_targets()
    RETURNS TABLE (router_id UUID, tenant_id UUID)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id, tenant_id FROM routers WHERE status <> 'pending' OR wg_public_key IS NOT NULL $$;

-- WireGuard gateway: every onboarded peer (public data only).
CREATE FUNCTION wireguard_peers()
    RETURNS TABLE (router_id UUID, public_key TEXT, tunnel_ip INET)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id, wg_public_key, tunnel_ip FROM routers WHERE wg_public_key IS NOT NULL $$;

REVOKE ALL ON FUNCTION tenant_login(TEXT), auth_session_tenant(BYTEA), tenant_by_slug(TEXT), tenant_by_portal_domain(TEXT),
    tenant_identity_taken(TEXT, TEXT, TEXT), router_by_tunnel_ip(INET), onboarding_token_lookup(BYTEA),
    allocate_tunnel_ip(CIDR), active_tenant_ids(), router_targets(), wireguard_peers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION tenant_login(TEXT), auth_session_tenant(BYTEA), tenant_by_slug(TEXT), tenant_by_portal_domain(TEXT),
    tenant_identity_taken(TEXT, TEXT, TEXT), router_by_tunnel_ip(INET), onboarding_token_lookup(BYTEA),
    allocate_tunnel_ip(CIDR), active_tenant_ids(), router_targets(), wireguard_peers() TO wisp_app;
