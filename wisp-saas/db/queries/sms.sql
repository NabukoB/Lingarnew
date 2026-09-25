-- name: InsertSMS :exec
INSERT INTO sms_messages (tenant_id, to_number, body, kind, status, credits, provider_id, error_message)
VALUES (app_tenant(), $1, $2, $3, $4, $5, $6, $7);

-- name: ListSMS :many
SELECT * FROM sms_messages ORDER BY created_at DESC LIMIT $1;
