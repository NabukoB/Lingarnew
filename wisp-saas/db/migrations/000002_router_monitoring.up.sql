-- Router monitoring: one health sample per poll, and the devices each router
-- sees next to it (for the network map).

-- One row per router per minute (resolution_sec = 60). Samples older than two
-- days are folded into hourly averages (resolution_sec = 3600), kept 31 days.
CREATE TABLE router_metrics (
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    router_id       UUID NOT NULL REFERENCES routers(id) ON DELETE CASCADE,
    at              TIMESTAMPTZ NOT NULL,
    resolution_sec  INTEGER NOT NULL DEFAULT 60 CHECK (resolution_sec IN (60, 3600)),
    cpu_load        SMALLINT NOT NULL CHECK (cpu_load BETWEEN 0 AND 100),
    mem_used_pct    SMALLINT NOT NULL CHECK (mem_used_pct BETWEEN 0 AND 100),
    uptime_sec      BIGINT,
    pppoe_users     INTEGER NOT NULL DEFAULT 0,
    hotspot_users   INTEGER NOT NULL DEFAULT 0,
    uplink          TEXT,           -- interface that holds the default route
    rx_bytes        BIGINT,         -- uplink counters as read (minute samples only)
    tx_bytes        BIGINT,
    rx_bps          BIGINT,         -- download through the uplink
    tx_bps          BIGINT,         -- upload through the uplink
    PRIMARY KEY (router_id, at)
);
CREATE INDEX router_metrics_tenant ON router_metrics (tenant_id, router_id, at DESC);
CREATE INDEX router_metrics_fold ON router_metrics (at) WHERE resolution_sec = 60;

-- Latest /ip/neighbor snapshot per router (replaced on every refresh).
CREATE TABLE router_neighbors (
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    router_id       UUID NOT NULL REFERENCES routers(id) ON DELETE CASCADE,
    interface       TEXT NOT NULL,
    mac_address     TEXT NOT NULL,
    identity        TEXT,
    address         TEXT,
    platform        TEXT,
    board           TEXT,
    version         TEXT,
    seen_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (router_id, interface, mac_address)
);
CREATE INDEX router_neighbors_tenant ON router_neighbors (tenant_id, router_id);

ALTER TABLE router_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON router_metrics USING (tenant_id = app_tenant()) WITH CHECK (tenant_id = app_tenant());
ALTER TABLE router_neighbors ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON router_neighbors USING (tenant_id = app_tenant()) WITH CHECK (tenant_id = app_tenant());

GRANT SELECT, INSERT, UPDATE, DELETE ON router_metrics, router_neighbors TO wisp_app;
