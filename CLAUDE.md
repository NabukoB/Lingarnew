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
**Competitors to beat:** Splynx, UISP, Sonar, Sonnet, Powercode.
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
- Our SaaS charges the WISP a flat monthly subscription fee (separate from end-user payments).
- M-Pesa `AccountReference` field MUST be the subscriber's PPPoE username for automatic reconciliation.

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

    -- M-Pesa config (each WISP has their own Paybill)
    mpesa_shortcode     TEXT,           -- e.g. "123456"
    mpesa_passkey       TEXT,           -- encrypted
    mpesa_consumer_key  TEXT,           -- encrypted
    mpesa_consumer_secret TEXT,         -- encrypted
    mpesa_env           TEXT DEFAULT 'sandbox',  -- sandbox | production

    -- SMS config
    africas_talking_key TEXT,
    africas_talking_sender TEXT,

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
    duration_days   INTEGER,               -- NULL = monthly recurring
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

    -- Links
    subscriber_id         UUID REFERENCES subscribers(id),
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
  "TransactionType": "CustomerPayBillOnline",
  "Amount": 1500,
  "PartyA": "2547XXXXXXXX",
  "PartyB": "123456",
  "PhoneNumber": "2547XXXXXXXX",
  "CallBackURL": "https://api.yourwifisaas.com/webhooks/mpesa/{tenant_slug}",
  "AccountReference": "john.doe",
  "TransactionDesc": "Bronze 5Mbps renewal"
}
→ { "MerchantRequestID": "...", "CheckoutRequestID": "...",
    "ResponseCode": "0", "CustomerMessage": "Success. Request accepted for processing" }
```

<!-- TODO: The source context was truncated here. Sections after 7.2 (STK callback
     handling, remaining Daraja endpoints, and any later sections) still need to be added. -->
