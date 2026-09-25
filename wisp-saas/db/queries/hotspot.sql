-- name: CreateVoucher :one
INSERT INTO vouchers (tenant_id, plan_id, code, batch) VALUES (app_tenant(), $1, $2, $3) RETURNING *;

-- name: ListVouchers :many
SELECT v.*, p.name AS plan_name FROM vouchers v JOIN plans p ON p.id = v.plan_id
WHERE (sqlc.narg('batch')::text IS NULL OR v.batch = sqlc.narg('batch')::text)
ORDER BY v.created_at DESC LIMIT $1;

-- name: GetVoucherByCodeForUpdate :one
SELECT * FROM vouchers WHERE code = $1 FOR UPDATE;

-- name: RedeemVoucher :exec
UPDATE vouchers SET redeemed_at = NOW(), redeemed_mac = $2 WHERE id = $1;

-- name: CreatePurchase :one
INSERT INTO hotspot_purchases (tenant_id, router_id, plan_id, source, phone_number, voucher_id, macs, max_devices, starts_at, expires_at)
VALUES (app_tenant(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetPurchase :one
SELECT * FROM hotspot_purchases WHERE id = $1;

-- name: ActivatePurchase :one
UPDATE hotspot_purchases SET starts_at = $2, expires_at = $3, mpesa_receipt_number = $4 WHERE id = $1 RETURNING *;

-- name: ActivePurchaseForMAC :one
SELECT h.*, p.bandwidth_down_kbps, p.bandwidth_up_kbps, p.data_cap_mb
FROM hotspot_purchases h JOIN plans p ON p.id = h.plan_id
WHERE @mac::text = ANY (h.macs) AND h.starts_at IS NOT NULL AND h.expires_at > NOW()
ORDER BY h.expires_at DESC LIMIT 1;

-- name: PurchaseByReceiptForUpdate :one
SELECT * FROM hotspot_purchases WHERE mpesa_receipt_number = upper(trim(@receipt::text)) FOR UPDATE;

-- name: AddPurchaseMAC :one
UPDATE hotspot_purchases SET macs = array_append(macs, @mac::text)
WHERE id = @id AND NOT (@mac::text = ANY (macs)) AND cardinality(macs) < max_devices
RETURNING *;

-- name: TrialUsedSince :one
SELECT EXISTS (SELECT 1 FROM hotspot_purchases WHERE source = 'trial' AND @mac::text = ANY (macs) AND created_at > @since::timestamptz) AS used;

-- name: ListExpiryNotices :many
SELECT h.*, p.name AS plan_name FROM hotspot_purchases h JOIN plans p ON p.id = h.plan_id
WHERE h.source = 'mpesa' AND h.phone_number IS NOT NULL AND h.expires_at <= NOW()
  AND h.expires_at > NOW() - INTERVAL '1 day' AND h.expiry_sms_sent_at IS NULL;

-- name: MarkExpirySMSSent :exec
UPDATE hotspot_purchases SET expiry_sms_sent_at = NOW() WHERE id = $1;

-- name: HotspotSalesSince :one
SELECT count(*)::int FROM hotspot_purchases WHERE source = 'mpesa' AND starts_at >= @since::timestamptz AND starts_at < @until::timestamptz;
