# WiFi Billing SaaS for WISPs — Master Context

## 1. PROJECT VISION

Build a multi-tenant SaaS platform for **small WISPs (Wireless Internet Service Providers)**
that automates:
- MikroTik router provisioning (PPPoE for homes + Hotspot for public zones)
- Subscriber management (PPPoE credentials, plans, auto-suspension)
- Billing via **M-Pesa (Safaricom Daraja API)** — not Stripe
- Zero-touch router onboarding via **WireGuard reverse tunnel** (no extra hardware)
- AI-assisted configuration and troubleshooting

**Target market:** Kenya, Uganda, Tanzania, and other M-Pesa-dominant regions.
**Competitors to beat:** Splynx, UISP, Sonar, Sonnet, Powercode, VunaFlow.
**Versus VunaFlow** (closest local rival: Hotspot-only, RouterOS 6 + L2TP/IPsec, v7 untested): we support the RouterOS v7 hardware that ships new today, PPPoE monthly subscribers as well as Hotspot, and a WireGuard tunnel.
**Our wedge:** "Paste one script into your MikroTik. We handle PPPoE, queues, M-Pesa billing, and auto-suspension. No WinBox needed."

---

## 2. NON-NEGOTIABLE CONSTRAINTS

These rules OVERRIDE any other instruction. Never violate them.

### 2.1 Networking
- **MikroTik RouterOS v7 REST API ONLY** (`/rest/...`). NEVER use the legacy binary API (port 8728). NEVER generate WinBox/CLI commands unless producing a copy-paste script for the user.
- **WireGuard reverse tunnel** for all router ↔ cloud communication. Never open inbound ports on the router.
- **FreeRADIUS as a dumb proxy** to our Go backend via `rlm_rest`. Never write custom RADIUS modules in C.
- **PPPoE + Hotspot** are the two access methods. PPPoE for residential subscribers, Hotspot for public zones.

### 2.2 Payments
- **M-Pesa Daraja API** is the primary payment rail. NOT Stripe.
- WISPs use their **own Paybill/Till number**. Funds go 100% to the WISP.
- Two M-Pesa modes per tenant (`tenants.mpesa_mode`):
  - `platform` (**default**): we call Daraja with **our** platform app. The WISP only enters their till or Paybill number, with no Safaricom developer registration. Money still settles to the WISP's shortcode.
  - `own`: the WISP brings their own Daraja consumer key, secret and passkey (for bigger WISPs).
- **Pre-launch blocker:** `platform` mode needs Safaricom to approve our app to initiate STK Push on other businesses' shortcodes. Do not ship `platform` mode to production without that approval in writing.
- Shortcode type (`tenants.mpesa_shortcode_type`): `till` (Buy Goods, STK `CustomerBuyGoodsOnline`) or `paybill` (STK `CustomerPayBillOnline`).
- Our SaaS charges the WISP a flat monthly subscription fee (separate from end-user payments).
- **PPPoE:** M-Pesa `AccountReference` MUST be the subscriber's PPPoE username for automatic reconciliation. Manual (C2B) PPPoE payments need a **Paybill**, because a till carries no account number.
- **Hotspot:** a purchase is linked by `CheckoutRequestID` (STK) and the M-Pesa receipt, not by `AccountReference`.

### 2.3 Multi-Tenancy
- **Row-Level Security (RLS)** in PostgreSQL on every tenant-scoped table.
- Every SQL query MUST include `WHERE tenant_id = current_setting('app.current_tenant_id')`.
- Never write a query that can leak cross-tenant data.

### 2.4 Code Quality
- Backend: **Go 1.22+** with `chi` router and `sqlc` (NOT GORM, NOT Prisma for Go).
- Frontend: **Next.js 14 App Router** + TypeScript + Tailwind.
- Every public function gets a unit test.
- Every DB write gets an integration test using `testcontainers`.
- All MikroTik API interactions tested against `mocks/mikrotik-mock`.
- All errors must be actionable. No "something went wrong" messages.

### 2.5 Security
- Never write custom crypto. Use stdlib + `golang.org/x/crypto`.
- All M-Pesa webhooks must be validated (IP allowlist + signature check).
- All Stripe-equivalent webhooks must verify signatures.
- All router REST API calls use HTTP Basic Auth over the WireGuard tunnel.
- Secrets in AWS Secrets Manager (prod) or `.env` (dev, gitignored).

---

## 3. TECH STACK

| Layer | Choice | Reason |
|---|---|---|
| Backend language | Go 1.22+ | Concurrency for RADIUS, AI-friendly, strict typing |
| HTTP router | `chi` v5 | Lightweight, stdlib-compatible |
| DB access | `sqlc` | Type-safe SQL, no ORM magic |
| Database | PostgreSQL 16 | RLS, rock solid |
| Cache | Redis 7 | Session state, IP allocation bitmap, M-Pesa token cache |
| RADIUS | FreeRADIUS 3.x | Battle-tested, `rlm_rest` proxy to Go |
| WireGuard | `wireguard-go` | Pure Go, portable |
| Frontend | Next.js 14 App Router | SSR, AI-friendly ecosystem |
| UI components | shadcn/ui | Copy-paste, customizable |
| Payments | Safaricom Daraja API | M-Pesa STK Push + callbacks |
| SMS | Africa's Talking | Regional SMS gateway |
| CDN/WAF | Cloudflare | Portal + dashboard |
| Infra | Docker + Kubernetes (k3s) | Portable, self-hostable |
| Observability | Prometheus + Grafana + Loki | Industry standard |
| CI/CD | GitHub Actions | Standard |

---

## 4. REPOSITORY STRUCTURE

```
wisp-saas/
├── CLAUDE.md                        # THIS FILE
├── docs/
│   ├── ARCHITECTURE.md              # High-level diagrams
│   ├── MIKROTIK_V7_REST_API.md      # Exact RouterOS v7 REST endpoints used
│   ├── DARAJA_API_SPEC.md           # M-Pesa Daraja API reference
│   ├── FREERADIUS_CONFIG.md         # FreeRADIUS rlm_rest setup
│   └── DEPLOYMENT.md                # Infra + k8s manifests
│
├── .cursorrules                     # Cursor-specific rules (mirror of Section 2)
│
├── services/
│   ├── tenant-svc/                  # Tenant CRUD, auth, branding
│   │   ├── cmd/server/main.go
│   │   ├── internal/
│   │   │   ├── handler/
│   │   │   ├── service/
│   │   │   ├── repository/
│   │   │   └── domain/
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   └── sqlc/
│   │   └── go.mod
│   │
│   ├── subscriber-svc/              # WISP subscribers (PPPoE + Hotspot users)
│   ├── router-svc/                  # MikroTik registry, config push, health
│   ├── billing-svc/                 # Plans, M-Pesa integration, invoices
│   ├── session-svc/                 # RADIUS proxy handlers, active sessions
│   └── tunnel-orchestrator/         # WireGuard peer mgmt
│
├── portals/
│   ├── captive-portal/              # Next.js — end-user payment page
│   └── dashboard/                   # Next.js — WISP admin UI
│
├── infra/
│   ├── docker/                      # Dockerfiles per service
│   ├── k8s/                         # Helm charts
│   ├── freeradius/                  # FreeRADIUS configs
│   └── wireguard/                   # WG server configs
│
├── mocks/
│   └── mikrotik-mock/               # Go HTTP server mimicking RouterOS v7 REST
│
├── tools/
│   ├── script-generator/            # Generates onboarding RouterOS scripts
│   └── load-tester/                 # Simulates RADIUS + REST load
│
├── tests/
│   ├── integration/
│   └── e2e/
│
├── go.work                          # Go workspace
├── docker-compose.yml               # Local dev (postgres, redis, freeradius, mock)
└── Makefile
```

---

## 5. DATABASE SCHEMA (PostgreSQL + sqlc)

### 5.1 Core Tables

```sql
-- ═══════════════════════════════════════════════════════
-- TENANTS (WISPs)
-- ═══════════════════════════════════════════════════════

CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    name            TEXT NOT NULL,
    slug            TEXT UNIQUE NOT NULL,
    plan            TEXT NOT NULL DEFAULT 'starter',  -- starter, pro, enterprise

    -- M-Pesa config (money always settles to the WISP's own shortcode)
    mpesa_mode          TEXT NOT NULL DEFAULT 'platform',  -- platform | own
    mpesa_shortcode_type TEXT NOT NULL DEFAULT 'till',     -- till | paybill
    mpesa_shortcode     TEXT,           -- till or Paybill number, e.g. "123456"
    -- The three columns below are only used when mpesa_mode = 'own'
    mpesa_passkey       TEXT,           -- encrypted
    mpesa_consumer_key  TEXT,           -- encrypted
    mpesa_consumer_secret TEXT,         -- encrypted
    mpesa_env           TEXT DEFAULT 'sandbox',  -- sandbox | production

    -- SMS config
    africas_talking_key TEXT,
    africas_talking_sender TEXT,
    sms_credits         INTEGER NOT NULL DEFAULT 0,   -- prepaid, 1 credit = 1 SMS
    hotspot_expiry_sms_enabled  BOOLEAN NOT NULL DEFAULT FALSE,  -- opt-in
    hotspot_expiry_sms_template TEXT,  -- placeholders: {business} {package} {link} {code} {support}
    support_phone       TEXT,           -- shown on the portal and in SMS

    -- Our subscription (what the WISP pays us)
    subscription_status TEXT NOT NULL DEFAULT 'trial',  -- trial | active | lapsed
    trial_ends_at       TIMESTAMPTZ,
    subscription_expires_at TIMESTAMPTZ,

    -- Branding
    portal_domain   TEXT,               -- portal.wispname.com
    logo_url        TEXT,
    primary_color   TEXT DEFAULT '#2563eb',

    timezone        TEXT DEFAULT 'Africa/Nairobi',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- LOCATIONS (WISP sites: towers, estates, POPs)
-- ═══════════════════════════════════════════════════════

CREATE TABLE locations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    address     TEXT,
    lat         DOUBLE PRECISION,
    lng         DOUBLE PRECISION,
    timezone    TEXT DEFAULT 'Africa/Nairobi',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_locations_tenant ON locations(tenant_id);

-- ═══════════════════════════════════════════════════════
-- ROUTERS (MikroTik devices)
-- ═══════════════════════════════════════════════════════

CREATE TABLE routers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id     UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

    -- Identity (populated after first connection)
    serial_number   TEXT UNIQUE,
    software_id     TEXT,
    board_name      TEXT,          -- e.g. "CCR2004-1G-12S+2XS"
    architecture    TEXT,
    firmware_version TEXT,

    -- Network
    tunnel_ip       INET UNIQUE NOT NULL,  -- 10.200.x.x
    lan_ip          INET,
    wg_public_key   TEXT UNIQUE NOT NULL,
    wg_endpoint     INET,          -- router's public IP:port

    -- State
    status          TEXT NOT NULL DEFAULT 'pending',  -- pending|online|degraded|offline|misconfigured
    last_seen_at    TIMESTAMPTZ,
    last_config_push TIMESTAMPTZ,
    config_hash     TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_routers_location ON routers(location_id);
CREATE INDEX idx_routers_status ON routers(status);

-- ═══════════════════════════════════════════════════════
-- SUBSCRIBERS (WISP customers — PPPoE or Hotspot)
-- ═══════════════════════════════════════════════════════

CREATE TABLE subscribers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    location_id     UUID REFERENCES locations(id),

    -- Identity
    full_name       TEXT NOT NULL,
    phone_number    TEXT NOT NULL,        -- 2547XXXXXXXX
    email           TEXT,
    physical_address TEXT,

    -- PPPoE credentials
    pppoe_username  TEXT UNIQUE,          -- e.g. "john.doe" — also used as M-Pesa AccountReference
    pppoe_password  TEXT,

    -- State
    status          TEXT NOT NULL DEFAULT 'active',  -- active|suspended|expired|cancelled
    current_plan_id UUID,

    -- Billing
    billing_cycle   TEXT DEFAULT 'monthly',
    next_renewal_at TIMESTAMPTZ,
    auto_renew      BOOLEAN DEFAULT TRUE,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_subscribers_tenant ON subscribers(tenant_id);
CREATE INDEX idx_subscribers_phone ON subscribers(phone_number);
CREATE INDEX idx_subscribers_pppoe ON subscribers(pppoe_username);
CREATE INDEX idx_subscribers_renewal ON subscribers(next_renewal_at) WHERE status = 'active';

-- ═══════════════════════════════════════════════════════
-- PLANS (WiFi packages the WISP sells)
-- ═══════════════════════════════════════════════════════

CREATE TABLE plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    location_id     UUID REFERENCES locations(id),  -- NULL = all locations

    name            TEXT NOT NULL,         -- e.g. "Bronze 5Mbps"
    description     TEXT,
    price_cents     INTEGER NOT NULL,      -- in minor units (KES cents, or just KES * 100)
    currency        TEXT DEFAULT 'KES',

    -- Access rules
    access_type     TEXT NOT NULL DEFAULT 'pppoe',  -- pppoe | hotspot
    duration_days   INTEGER,               -- PPPoE: NULL = monthly recurring
    duration_minutes INTEGER,              -- Hotspot packages, e.g. 30 = "30 min for KSh 10"
    is_trial        BOOLEAN DEFAULT FALSE, -- Hotspot free trial (price 0)
    data_cap_mb     BIGINT,                -- NULL = unlimited
    bandwidth_down  INTEGER NOT NULL,      -- kbps
    bandwidth_up    INTEGER NOT NULL,      -- kbps

    -- PPPoE profile name (auto-generated, e.g. "plan_bronze_5m")
    mikrotik_profile_name TEXT,

    is_active       BOOLEAN DEFAULT TRUE,
    is_default      BOOLEAN DEFAULT FALSE,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_plans_tenant ON plans(tenant_id, is_active);

-- Link subscribers to plans
ALTER TABLE subscribers ADD CONSTRAINT fk_subscribers_plan
    FOREIGN KEY (current_plan_id) REFERENCES plans(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════
-- MPESA TRANSACTIONS
-- ═══════════════════════════════════════════════════════

CREATE TABLE mpesa_transactions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             UUID NOT NULL REFERENCES tenants(id),

    -- Daraja identifiers
    merchant_request_id   TEXT UNIQUE NOT NULL,
    checkout_request_id   TEXT UNIQUE NOT NULL,
    mpesa_receipt_number  TEXT UNIQUE,    -- e.g. "RKT8765432"

    -- Transaction
    phone_number          TEXT NOT NULL,  -- 2547...
    amount                INTEGER NOT NULL, -- in minor units
    account_reference     TEXT NOT NULL,  -- PPPoE username (critical for reconciliation)
    transaction_desc      TEXT,

    -- Status
    status                TEXT NOT NULL DEFAULT 'pending',  -- pending|success|failed|expired
    result_code           INTEGER,
    result_desc           TEXT,
    callback_received_at  TIMESTAMPTZ,

    -- Links (exactly one of subscriber_id / hotspot_purchase_id is set)
    subscriber_id         UUID REFERENCES subscribers(id),
    hotspot_purchase_id   UUID,           -- FK added after hotspot_purchases is created
    session_id            UUID,

    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_mpesa_tenant ON mpesa_transactions(tenant_id, created_at DESC);
CREATE INDEX idx_mpesa_merchant ON mpesa_transactions(merchant_request_id);
CREATE INDEX idx_mpesa_subscriber ON mpesa_transactions(subscriber_id);

-- ═══════════════════════════════════════════════════════
-- SESSIONS (Active PPPoE or Hotspot connections)
-- ═══════════════════════════════════════════════════════

CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    location_id     UUID NOT NULL REFERENCES locations(id),
    router_id       UUID NOT NULL REFERENCES routers(id),
    plan_id         UUID REFERENCES plans(id),

    -- Client identity
    access_type     TEXT NOT NULL,        -- 'pppoe' | 'hotspot'
    username        TEXT NOT NULL,        -- PPPoE username or MAC
    mac_address     TEXT,                 -- for hotspot
    ip_address      INET,
    calling_station_id TEXT,              -- RADIUS Calling-Station-ID

    -- Lifecycle
    status          TEXT NOT NULL DEFAULT 'authenticating',
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    terminated_at   TIMESTAMPTZ,
    termination_cause TEXT,

    -- Accounting (updated by RADIUS Accounting)
    bytes_in        BIGINT DEFAULT 0,
    bytes_out       BIGINT DEFAULT 0,
    session_time_sec INTEGER DEFAULT 0,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sessions_tenant ON sessions(tenant_id, started_at DESC);
CREATE INDEX idx_sessions_router ON sessions(router_id, status);
CREATE INDEX idx_sessions_active ON sessions(tenant_id, status) WHERE status = 'active';

-- ═══════════════════════════════════════════════════════
-- HOTSPOT: VOUCHERS + PURCHASES (pay-as-you-go customers, no account)
-- ═══════════════════════════════════════════════════════

CREATE TABLE vouchers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id         UUID NOT NULL REFERENCES plans(id),
    code            TEXT NOT NULL,         -- short, unambiguous chars (no 0/O, 1/I)
    batch           TEXT,                  -- printed batch label
    redeemed_at     TIMESTAMPTZ,
    redeemed_mac    TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, code)
);

CREATE TABLE hotspot_purchases (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    location_id     UUID REFERENCES locations(id),
    plan_id         UUID NOT NULL REFERENCES plans(id),
    source          TEXT NOT NULL,         -- mpesa | voucher | trial
    phone_number    TEXT,                  -- 2547... (mpesa only)
    -- mpesa purchases: linked from mpesa_transactions.hotspot_purchase_id
    mpesa_receipt_number TEXT,             -- copied on callback; used by the Reconnect tab
    voucher_id      UUID REFERENCES vouchers(id),
    macs            TEXT[] NOT NULL DEFAULT '{}',  -- devices using this purchase
    max_devices     INTEGER NOT NULL DEFAULT 1,
    starts_at       TIMESTAMPTZ,           -- NULL while the STK Push is pending
    expires_at      TIMESTAMPTZ,
    expiry_sms_sent_at TIMESTAMPTZ,        -- expiry SMS goes out at most once
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_hotspot_purchases_tenant ON hotspot_purchases(tenant_id, created_at DESC);
CREATE INDEX idx_hotspot_purchases_receipt ON hotspot_purchases(tenant_id, mpesa_receipt_number);
CREATE INDEX idx_hotspot_purchases_expiry ON hotspot_purchases(expires_at)
    WHERE expiry_sms_sent_at IS NULL;

ALTER TABLE mpesa_transactions ADD CONSTRAINT fk_mpesa_hotspot_purchase
    FOREIGN KEY (hotspot_purchase_id) REFERENCES hotspot_purchases(id);

-- ═══════════════════════════════════════════════════════
-- CONFIG AUDIT LOG
-- ═══════════════════════════════════════════════════════

CREATE TABLE config_audit (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    router_id       UUID NOT NULL REFERENCES routers(id),
    action          TEXT NOT NULL,        -- PUSH_CONFIG, REBOOT, FACTORY_RESET, SUSPEND_USER, etc.
    payload         JSONB NOT NULL,
    status          TEXT NOT NULL,        -- SUCCESS, FAILED
    error_message   TEXT,
    initiated_by    TEXT NOT NULL,        -- 'system', 'tenant:<id>', 'ai', 'cron'
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_config_audit_router ON config_audit(router_id, created_at DESC);

-- ═══════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE routers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE mpesa_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotspot_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_locations ON locations
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_routers ON routers
    USING (EXISTS (SELECT 1 FROM locations WHERE id = routers.location_id
        AND tenant_id = current_setting('app.current_tenant_id')::uuid));
CREATE POLICY tenant_isolation_subscribers ON subscribers
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_plans ON plans
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_mpesa ON mpesa_transactions
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_sessions ON sessions
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_vouchers ON vouchers
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_hotspot_purchases ON hotspot_purchases
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Platform admin bypass
CREATE POLICY platform_admin ON locations USING (
    current_setting('app.is_platform_admin', true)::boolean = true);
-- (repeat for each table)
```

---

## 6. MIKROTIK V7 REST API — ENDPOINTS USED

Reference: `docs/MIKROTIK_V7_REST_API.md`

All calls use HTTP Basic Auth over the WireGuard tunnel (e.g. `https://10.200.1.5/rest/...`).

### 6.1 Identity & Health
```
GET /rest/system/resource
→ { "board-name": "hAP ax3", "version": "7.15.2", "uptime": "1d2h3m",
    "cpu-load": "12%", "free-memory": 128000000 }

GET /rest/system/identity
→ { "name": "Tower-Alpha-01" }
```

### 6.2 RADIUS
```
POST /rest/radius
{ "service": "pppoe", "address": "radius.yourwifisaas.com",
  "secret": "per-router-secret", "timeout": "2s" }
POST /rest/radius
{ "service": "hotspot", "address": "radius.yourwifisaas.com",
  "secret": "per-router-secret", "timeout": "2s" }
```

### 6.3 PPPoE Server
```
GET  /rest/ppp/profile
POST /rest/ppp/profile
{ "name": "plan_bronze_5m", "rate-limit": "5M/2M",
  "parent-queue": "plan_bronze_5m" }

GET  /rest/interface/pppoe-server/server
POST /rest/interface/pppoe-server/server
{ "service-name": "WISP-PPPoE", "interface": "bridge-lan",
  "authentication": "pap,chap,mschap2", "default-profile": "default" }
```

### 6.4 Hotspot (for public zones)
```
POST /rest/ip/pool
{ "name": "hotspot-pool", "ranges": "172.20.0.2-172.20.0.254" }

POST /rest/ip/hotspot/profile
{ "name": "wisp-portal", "login-by": "http-pap",
  "radius-interim-update": "5m" }

POST /rest/interface/hotspot
{ "interface": "bridge-public", "address-pool": "hotspot-pool",
  "profile": "wisp-portal" }

POST /rest/ip/hotspot/walled-garden
{ "action": "accept", "dst-host": "*.safaricom.co.ke" }
{ "action": "accept", "dst-host": "*.mpesa.com" }
{ "action": "accept", "dst-host": "portal.yourwifisaas.com" }
```

### 6.5 Queues (bandwidth per subscriber)
```
POST /rest/queue/simple
{ "name": "pppoe-john.doe", "target": "john.doe",
  "max-limit": "5M/2M", "priority": 8/8 }

DELETE /rest/queue/simple/{id}
```

### 6.6 Active Sessions (for monitoring)
```
GET /rest/ppp/active
→ [ { "name": "john.doe", "caller-id": "10.0.0.5",
      "uptime": "2h3m", "encoding": "pppoe" } ]

GET /rest/hotspot/active
→ [ { "user": "AA:BB:CC:DD:EE:FF", "ip": "172.20.0.42",
      "uptime": "15m" } ]
```

### 6.7 Neighbors (for topology map)
```
GET /rest/ip/neighbor
→ [ { "interface": "ether3", "identity": "Tower-Alpha-02",
      "ip-address": "192.168.50.2", "system-description": "MikroTik" } ]
```

---

## 7. M-PESA DARAJA API — ENDPOINTS USED

Reference: `docs/DARAJA_API_SPEC.md`

Base URL (sandbox): `https://sandbox.safaricom.co.ke`
Base URL (prod):    `https://api.safaricom.co.ke`

### 7.1 OAuth2 Token
```
GET /oauth/v1/generate?grant_type=client_credentials
Authorization: Basic base64(consumerKey:consumerSecret)
→ { "access_token": "...", "expires_in": "3599" }

CACHE this token in Redis with TTL = expires_in - 60s.
```

### 7.2 STK Push (Lipa Na M-Pesa Online)
```
POST /mpesa/stkpush/v1/processrequest
{
  "BusinessShortCode": "123456",
  "Password": base64(ShortCode + Passkey + Timestamp),
  "Timestamp": "20260925143022",
  "TransactionType": "CustomerPayBillOnline",   // till: "CustomerBuyGoodsOnline"
  "Amount": 1500,
  "PartyA": "2547XXXXXXXX",
  "PartyB": "123456",                           // till number when shortcode type = till
  "PhoneNumber": "2547XXXXXXXX",
  "CallBackURL": "https://api.yourwifisaas.com/webhooks/mpesa/{tenant_slug}",
  "AccountReference": "john.doe",               // Hotspot: purchase short id
  "TransactionDesc": "Bronze 5Mbps renewal"
}
→ { "MerchantRequestID": "...", "CheckoutRequestID": "...",
    "ResponseCode": "0", "CustomerMessage": "Success. Request accepted for processing" }
```

### 7.3 STK Push Callback (Safaricom → us)
```
POST {CallBackURL}
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "29115-34620561-1",
      "CheckoutRequestID": "ws_CO_191220191020363925",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 1500 },
          { "Name": "MpesaReceiptNumber", "Value": "RKT8765432" },
          { "Name": "TransactionDate", "Value": 20260925143055 },
          { "Name": "PhoneNumber", "Value": 254712345678 }
        ]
      }
    }
  }
}
← { "ResultCode": 0, "ResultDesc": "Accepted" }
```

Rules:
- Look up the row by `checkout_request_id`. Unknown ID → log + return Accepted (never 4xx/5xx; Safaricom retries).
- Idempotent on `mpesa_receipt_number` (UNIQUE). A duplicate callback MUST NOT extend the subscription twice.
- `CallbackMetadata` is ABSENT on failure. Never assume it exists.
- Result codes to handle explicitly:

| ResultCode | Meaning | Our status | User-facing message |
|---|---|---|---|
| 0 | Success | `success` | "Payment received. You're back online." |
| 1 | Insufficient balance | `failed` | "Insufficient M-Pesa balance. Top up and retry." |
| 1032 | Cancelled by user | `failed` | "You cancelled the M-Pesa prompt. Tap Pay to retry." |
| 1037 | Phone unreachable / timeout | `expired` | "We couldn't reach your phone. Make sure it's on and retry." |
| 2001 | Wrong PIN | `failed` | "Wrong M-Pesa PIN. Please retry." |

### 7.4 STK Push Query (reconcile stuck transactions)
```
POST /mpesa/stkpushquery/v1/query
{ "BusinessShortCode": "123456", "Password": "...", "Timestamp": "...",
  "CheckoutRequestID": "ws_CO_191220191020363925" }
→ { "ResultCode": "0", "ResultDesc": "..." }
```
A worker queries every transaction still `pending` after 60s. After 5 minutes with no success → `expired`.

### 7.5 C2B (manual Paybill payments)
Subscribers who pay via "Lipa na M-Pesa → Paybill" (not STK Push) are captured with C2B.
```
POST /mpesa/c2b/v2/registerurl
{ "ShortCode": "123456", "ResponseType": "Completed",
  "ConfirmationURL": "https://api.yourwifisaas.com/webhooks/mpesa/{tenant_slug}/{token}/c2b/confirm",
  "ValidationURL":   "https://api.yourwifisaas.com/webhooks/mpesa/{tenant_slug}/{token}/c2b/validate" }

Confirmation payload (Safaricom → us):
{ "TransactionType": "Pay Bill", "TransID": "RKT8765432", "TransTime": "20260925143055",
  "TransAmount": "1500.00", "BusinessShortCode": "123456",
  "BillRefNumber": "john.doe", "MSISDN": "2547 ***** 678", "FirstName": "JOHN" }
← { "ResultCode": 0, "ResultDesc": "Accepted" }
```
- `BillRefNumber` = PPPoE username. Match case-insensitively after trimming whitespace.
- Unmatched payments go to a **manual reconciliation queue** in the dashboard. NEVER drop them.
- `MSISDN` may be masked/hashed. Do not rely on it for matching.

### 7.6 Callback Security
Daraja does **not** sign callbacks. Section 2.5's "signature check" is implemented as:
1. **IP allowlist** of Safaricom callback IPs (configurable, not hardcoded).
2. **Per-tenant random token** (32 bytes, `crypto/rand`) in the callback URL path, compared with `subtle.ConstantTimeCompare`.
3. **Re-verification**: before crediting an STK payment, confirm it with STK Query (7.4) when the amount or subscriber looks anomalous.

---

## 8. RADIUS FLOW (FreeRADIUS `rlm_rest` → Go `session-svc`)

Reference: `docs/FREERADIUS_CONFIG.md`

FreeRADIUS holds no business logic. Every request is forwarded as JSON:
```
POST /radius/authorize      # Access-Request: look up user, return check/reply attrs
POST /radius/authenticate   # PAP/CHAP verification (MSCHAPv2 needs cleartext password via authorize)
POST /radius/accounting     # Start / Interim-Update / Stop
```

The tenant is resolved from the **NAS-IP-Address** (= router tunnel IP) → `routers` → `locations.tenant_id`. Never trust a tenant hint from the request body.

### 8.1 Authorize reply (active subscriber)
```json
{
  "reply:Mikrotik-Rate-Limit": "2M/5M",
  "reply:Session-Timeout": 86400,
  "reply:Acct-Interim-Interval": 300,
  "reply:Framed-Pool": "pppoe-pool"
}
```
- `Mikrotik-Rate-Limit` is derived from `plans.bandwidth_up/down`. RouterOS syntax is `rx/tx` from the router's view, which is **client upload / client download**. A 5 Mbps down / 2 Mbps up plan is therefore `2M/5M`. The same order applies to `/queue/simple` `max-limit`.
- `Session-Timeout` = seconds until `next_renewal_at`, capped at 24h.
- Suspended/expired PPPoE → Access-Reject with `Reply-Message` explaining how to pay (`"Account expired. Pay via M-Pesa Paybill 123456, Account: john.doe"`).
- Hotspot unpaid MAC → reject; the router redirects the user to the captive portal (walled garden allows M-Pesa hosts).

### 8.2 Accounting
- `Start` → insert `sessions` row (`status='active'`).
- `Interim-Update` → update `bytes_in/out`, `session_time_sec`. Enforce `data_cap_mb` here.
- `Stop` → set `terminated_at`, `termination_cause`, `status='terminated'`.

### 8.3 Kicking users (suspension / plan change)
Send **RADIUS Disconnect-Request (RFC 5176)** to the router's tunnel IP on UDP 3799 (`/radius incoming set accept=yes` in the onboarding script). Fall back to `DELETE /rest/ppp/active/{id}` if CoA fails. Log both to `config_audit`.

---

## 9. ROUTER ONBOARDING (WireGuard reverse tunnel)

### 9.0 First-run wizard (dashboard)
Sign up (email, business name, password) → **Settings**: till/Paybill number + support phone → **Packages**: price plans → **Portal designer** (optional: logo, colour) → **Add router**. A new WISP must reach "Router connected!" in about 10 minutes with no MikroTik experience.

### 9.1 Router flow
1. WISP clicks **Add router** in the dashboard and picks a location.
2. `tunnel-orchestrator` allocates a tunnel IP from `10.200.0.0/16` (Redis bitmap, with a DB `UNIQUE` constraint as the source of truth).
3. `tools/script-generator` renders a **one-time RouterOS script** (valid 24h, single use). The dashboard shows it in a box with a **Copy command** button; the WISP pastes it into the router's terminal (WinBox → New Terminal, or SSH). The script:
   - **pre-flight first**, and stops with a plain message if any check fails:
     - RouterOS ≥ 7.1, otherwise it prints how to upgrade
     - internet reachable (`/ping 8.8.8.8 count=4`)
     - enough free space for the config
   - prints progress lines as it goes (`WISP setup: tunnel… done`), ending with `Setup complete. Router will dial home in ~10 seconds.`
   - creates `/interface wireguard` `wg-saas` and generates the router's private key **on the router** (the private key never leaves it)
   - adds the server peer with `persistent-keepalive=25s` and `allowed-address=10.200.0.1/32`
   - creates a least-privilege REST user and enables `www-ssl` bound to the tunnel address only
   - configures RADIUS clients (6.2) and `/radius incoming accept=yes`
   - installs **anti-bypass firewall rules**:
     - only the hotspot and PPPoE paths reach the internet
     - DNS is forced to the router
     - unauthenticated clients can reach only the walled garden
   - calls back `POST https://api.yourwifisaas.com/onboard/{one_time_token}` with its public key via `/tool fetch`
4. On callback, `tunnel-orchestrator` adds the peer to the WG server and stores `wg_public_key`.
5. The first successful `GET /rest/system/resource` over the tunnel populates identity fields and sets `status='online'`.
6. The dashboard `/connect` page polls and flips to **"Router connected!"** within about 60s. It then shows a checklist of what was deployed: tunnel, RADIUS, PPPoE server, Hotspot + portal, walled garden, anti-bypass firewall, packages.
7. Health poll every 60s: 3 consecutive misses → `degraded`, 10 → `offline` (alert the WISP via SMS/email).

Onboarding errors MUST tell the user exactly what to fix (e.g. "RouterOS 6.x detected. WireGuard needs RouterOS v7.1+. Upgrade via System → Packages.").

### 9.2 Troubleshooting (shown in the dashboard and help page)

| Symptom | Most likely cause | Fix shown to the WISP |
|---|---|---|
| Script stops at "no internet" | Uplink cable in the wrong port (e.g. Safaricom Home Fibre LAN1 is IPTV-only) | Move the cable to LAN2/3/4 on the fibre router, re-run the script |
| Script stops at "RouterOS 6.x" | Old firmware | System → Packages → Check for updates → upgrade to v7, re-run |
| `/connect` stuck on "Waiting for router" > 2 min | Outbound UDP to the WireGuard port blocked upstream | Check `/interface wireguard peers` for a handshake; ask the uplink ISP to allow outbound UDP |
| Phone joins Wi-Fi but no portal pops up | Stale cached DHCP lease or portal page | Forget the network, toggle airplane mode 5s, reconnect |
| Customer paid but has no internet | Callback delay from Safaricom | Customer uses the **Reconnect** tab with their M-Pesa receipt code (9A) |

---

## 9A. HOTSPOT SALES (captive portal)

The portal shows the WISP's business name, logo, colour and support phone, plus four tabs:

| Tab | What happens | Rules |
|---|---|---|
| **Free trial** | Short free package (`plans.is_trial`) | Once per MAC per 24h. Off unless the WISP creates a trial plan |
| **Buy package** | Pick package → enter 2547… → STK Push → PIN → online | Till: `CustomerBuyGoodsOnline`; Paybill: `CustomerPayBillOnline`. A pending `hotspot_purchases` row (plan + MAC) is created with the STK Push. Callback success sets `starts_at`/`expires_at` and the receipt |
| **Voucher** | Enter a printed code | Single use (`vouchers.redeemed_at`). Code must belong to this tenant and plan must be active |
| **Reconnect** | Enter the M-Pesa receipt code Safaricom SMS'd them | Receipt must belong to this tenant and its purchase must still be active. Adds the MAC while `len(macs) < max_devices`. Free. Also covers delayed callbacks: if we have no callback yet, confirm with STK Query (7.4) first |

- Hotspot RADIUS identity is the device MAC. Authorize succeeds when the MAC is in an active `hotspot_purchases.macs`, and `Session-Timeout` = seconds until `expires_at`.
- Packages appear on the portal automatically once created. No redeploy is needed.

---

## 10. BILLING LIFECYCLE

- **Renewal cron** every 15 min, evaluated in the tenant's timezone.
- **Reminders** (Africa's Talking SMS) 3 days and 1 day before `next_renewal_at`, with Paybill + account number.
- **Expiry** → configurable grace period (default 0h) → `status='suspended'` → CoA disconnect (8.3).
- **Successful payment** →
  - `next_renewal_at = max(now, next_renewal_at) + plan duration`
  - `status='active'` (the next RADIUS auth succeeds)
  - SMS receipt with the M-Pesa receipt number and new expiry date
- **Partial payment** (amount < plan price) → credit a balance and do not reactivate. Tell the user the remaining amount.
- **Overpayment** → credit a balance toward the next cycle.
- Every router-side action (suspend, reactivate, profile push) writes a `config_audit` row.

### 10.1 Hotspot expiry SMS (opt-in)
- Off until the WISP turns it on (`tenants.hotspot_expiry_sms_enabled`). Nothing is sent on their behalf without asking.
- Sent **once per purchase**, only **after** the time is used up (`expiry_sms_sent_at` guards it). Never sent as a warning beforehand.
- Default template: `Your {business} hotspot package ({package}) has expired. Buy another package to reconnect: {link}`. Placeholders: `{business} {package} {link} {code} {support}`. Warn in the editor above 160 characters (the SMS is billed per part).
- Costs 1 SMS credit per message from `tenants.sms_credits`. With zero credits, skip the SMS and show a dashboard banner. Numbers we can't deliver to are skipped and not charged.

### 10.2 Our subscription (the WISP pays us)
- New tenants start on `trial`. After that, a flat monthly fee is paid by M-Pesa STK Push to **our** shortcode. SMS credits are topped up the same way.
- When the subscription lapses, block deploys, new routers and config changes, with a clear "Subscription expired, top up in Billing" message. **Never** cut off end users who have already paid.

---

## 11. CODING CONVENTIONS

### 11.1 Go
- Tenant middleware opens a transaction and runs `SET LOCAL app.current_tenant_id = $1`. Repositories take a `pgx.Tx`, never a raw pool, for tenant-scoped queries.
- Layers: `handler` (HTTP only) → `service` (business rules) → `repository` (sqlc). No SQL in handlers or services.
- Migrations: `golang-migrate`, sequential numbers `000123_add_x.up.sql` / `.down.sql`. Every migration has a working down.
- Run `sqlc generate` after query changes and commit the generated code.
- Logging: `log/slog` JSON with `tenant_id`, `request_id`, `router_id` where relevant. NEVER log secrets, M-Pesa passkeys, or PPPoE passwords.
- Context everywhere; every outbound call (Daraja, router REST, SMS) has an explicit timeout.

### 11.2 API errors
```json
{ "error": { "code": "ROUTER_UNREACHABLE",
             "message": "Router Tower-Alpha-01 did not respond over the tunnel.",
             "hint": "Check the router has internet and that wg-saas shows a recent handshake." } }
```

### 11.3 Data formats
- Phone numbers: normalize to `2547XXXXXXXX` / `2541XXXXXXXX` on input. Reject anything else with a clear message.
- Money: integer minor units everywhere. Daraja takes whole KES, so convert at the boundary only.
- Times: store `TIMESTAMPTZ` in UTC. Render in the tenant or location timezone.
- Encrypted columns (M-Pesa creds, PPPoE passwords): `golang.org/x/crypto/nacl/secretbox` with a key from Secrets Manager.

---

## 12. ENVIRONMENT VARIABLES

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection (app role, RLS enforced, NOT superuser) |
| `REDIS_URL` | Redis connection |
| `ENCRYPTION_KEY` | 32-byte key for secretbox-encrypted columns |
| `MPESA_CALLBACK_BASE_URL` | Public base URL for Daraja callbacks |
| `MPESA_PLATFORM_CONSUMER_KEY` / `MPESA_PLATFORM_CONSUMER_SECRET` | Our platform Daraja app (`mpesa_mode = platform`) |
| `MPESA_PLATFORM_PASSKEY` / `MPESA_PLATFORM_SHORTCODE` | Platform STK credentials and the shortcode WISPs pay our subscription to |
| `MPESA_ALLOWED_IPS` | Comma-separated Safaricom callback IPs |
| `WG_SERVER_PUBLIC_KEY` / `WG_SERVER_ENDPOINT` | Embedded in onboarding scripts |
| `WG_TUNNEL_CIDR` | Default `10.200.0.0/16` |
| `RADIUS_SECRET_SEED` | Used to derive per-router RADIUS secrets (HKDF) |
| `AT_API_KEY` / `AT_USERNAME` | Africa's Talking (platform-level; tenants may override) |

---

## 13. WORKING AGREEMENT FOR CLAUDE

- Read Section 2 before every task. If a request conflicts with it, stop and say so.
- Ask before changing the DB schema, public API contracts, or the onboarding script format.
- When you add or change a MikroTik or Daraja call, update `docs/MIKROTIK_V7_REST_API.md` or `docs/DARAJA_API_SPEC.md` in the same change.
- Run `make lint test` before committing. Integration tests need Docker (`testcontainers`).
- Keep PRs small and single-purpose. One service per PR where possible.
- Never commit `.env`, real Paybill credentials, or router passwords. Use sandbox shortcode `174379` in tests and examples.
