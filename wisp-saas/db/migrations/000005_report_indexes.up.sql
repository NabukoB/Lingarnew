-- Indexes for the dashboard's money and activity numbers. Found by the perf
-- suite (cmd/api/perf_test.go): with 60k payments these queries were full
-- scans, 150 ms each, several per page load.

-- Revenue totals, buckets, split and top plans: paid customer payments by callback time.
CREATE INDEX mpesa_revenue ON mpesa_transactions (tenant_id, callback_received_at)
    INCLUDE (amount_cents, subscriber_id, hotspot_purchase_id)
    WHERE purpose = 'customer' AND status = 'success';

-- Payments feed (ListPayments), newest first.
CREATE INDEX mpesa_payments_feed ON mpesa_transactions (tenant_id, (COALESCE(callback_received_at, created_at)) DESC)
    WHERE purpose = 'customer' AND status IN ('success', 'unmatched');

-- "Online now" and "online 24h ago": sessions still open, or closed after a moment.
CREATE INDEX sessions_open_at ON sessions (tenant_id, terminated_at);

-- Hotspot sales today vs yesterday.
CREATE INDEX hotspot_purchases_sales ON hotspot_purchases (tenant_id, starts_at) WHERE source = 'mpesa';
