-- AI assistant: questions and tokens per WISP per day, for the daily limit and cost tracking.
CREATE TABLE assistant_usage (
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    day             DATE NOT NULL,
    questions       INTEGER NOT NULL DEFAULT 0,
    input_tokens    BIGINT NOT NULL DEFAULT 0,
    output_tokens   BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, day)
);

ALTER TABLE assistant_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON assistant_usage USING (tenant_id = app_tenant()) WITH CHECK (tenant_id = app_tenant());
GRANT SELECT, INSERT, UPDATE, DELETE ON assistant_usage TO wisp_app;
