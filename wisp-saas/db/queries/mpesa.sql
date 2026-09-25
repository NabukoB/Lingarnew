-- name: CreateSTKTransaction :one
INSERT INTO mpesa_transactions (tenant_id, source, purpose, merchant_request_id, checkout_request_id, phone_number,
                                amount_cents, account_reference, transaction_desc, subscriber_id, hotspot_purchase_id)
VALUES (app_tenant(), 'stk', $1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetTxByCheckoutForUpdate :one
SELECT * FROM mpesa_transactions WHERE checkout_request_id = $1 FOR UPDATE;

-- name: GetTx :one
SELECT * FROM mpesa_transactions WHERE id = $1;

-- name: GetTxByCheckout :one
SELECT * FROM mpesa_transactions WHERE checkout_request_id = $1;

-- name: TxReceiptExists :one
SELECT EXISTS (SELECT 1 FROM mpesa_transactions WHERE mpesa_receipt_number = $1) AS exists;

-- name: CompleteTx :exec
UPDATE mpesa_transactions SET status = $2, result_code = $3, result_desc = $4, mpesa_receipt_number = $5,
    amount_cents = COALESCE(sqlc.narg('amount_cents')::int, amount_cents), callback_received_at = NOW(), updated_at = NOW()
WHERE id = $1;

-- name: ListPendingTx :many
SELECT * FROM mpesa_transactions WHERE status = 'pending' AND source = 'stk' AND created_at < @older_than::timestamptz
ORDER BY created_at LIMIT 100;

-- name: CreateC2BTransaction :one
INSERT INTO mpesa_transactions (tenant_id, source, mpesa_receipt_number, phone_number, amount_cents, account_reference,
                                status, subscriber_id, callback_received_at)
VALUES (app_tenant(), 'c2b', $1, $2, $3, $4, $5, $6, NOW())
RETURNING *;

-- name: MatchTx :exec
UPDATE mpesa_transactions SET status = 'success', subscriber_id = $2, updated_at = NOW() WHERE id = $1 AND status = 'unmatched';

-- name: ListPayments :many
SELECT t.*, s.pppoe_username, s.full_name, p.name AS plan_name
FROM mpesa_transactions t
LEFT JOIN subscribers s ON s.id = t.subscriber_id
LEFT JOIN hotspot_purchases h ON h.id = t.hotspot_purchase_id
LEFT JOIN plans p ON p.id = COALESCE(h.plan_id, s.plan_id)
WHERE t.purpose = 'customer' AND t.status IN ('success', 'unmatched')
  AND (sqlc.narg('status')::text IS NULL OR t.status = sqlc.narg('status')::text)
ORDER BY COALESCE(t.callback_received_at, t.created_at) DESC
LIMIT $1;

-- name: RevenueBetween :one
SELECT COALESCE(sum(amount_cents), 0)::bigint AS cents
FROM mpesa_transactions WHERE purpose = 'customer' AND status = 'success'
  AND callback_received_at >= @since::timestamptz AND callback_received_at < @until::timestamptz;

-- name: RevenueBuckets :many
SELECT date_bin(@bucket::interval, callback_received_at, @since::timestamptz)::timestamptz AS bucket,
       COALESCE(sum(amount_cents), 0)::bigint AS cents
FROM mpesa_transactions WHERE purpose = 'customer' AND status = 'success'
  AND callback_received_at >= @since::timestamptz AND callback_received_at < @until::timestamptz
GROUP BY 1 ORDER BY 1;

-- name: RevenueSplit :many
SELECT CASE WHEN t.hotspot_purchase_id IS NOT NULL THEN 'hotspot' ELSE 'pppoe' END AS kind,
       COALESCE(sum(t.amount_cents), 0)::bigint AS cents
FROM mpesa_transactions t
WHERE t.purpose = 'customer' AND t.status = 'success'
  AND t.callback_received_at >= @since::timestamptz AND t.callback_received_at < @until::timestamptz
GROUP BY 1;

-- name: VoucherValueBetween :one
SELECT COALESCE(sum(p.price_cents), 0)::bigint AS cents
FROM vouchers v JOIN plans p ON p.id = v.plan_id
WHERE v.redeemed_at >= @since::timestamptz AND v.redeemed_at < @until::timestamptz;

-- name: TopPlans :many
SELECT p.id, p.name, p.access_type, count(t.id)::int AS sold, COALESCE(sum(t.amount_cents), 0)::bigint AS cents
FROM mpesa_transactions t
LEFT JOIN hotspot_purchases h ON h.id = t.hotspot_purchase_id
LEFT JOIN subscribers s ON s.id = t.subscriber_id
JOIN plans p ON p.id = COALESCE(h.plan_id, s.plan_id)
WHERE t.purpose = 'customer' AND t.status = 'success'
  AND t.callback_received_at >= @since::timestamptz AND t.callback_received_at < @until::timestamptz
GROUP BY p.id, p.name, p.access_type
ORDER BY cents DESC LIMIT @lim::int;

-- name: CountUnmatched :one
SELECT count(*)::int FROM mpesa_transactions WHERE status = 'unmatched';

-- name: LatestTxForPurchase :one
SELECT * FROM mpesa_transactions WHERE hotspot_purchase_id = $1 ORDER BY created_at DESC LIMIT 1;
