-- name: TakeAssistantQuestion :one
-- Counts one question for today; returns no row once the daily limit is reached.
INSERT INTO assistant_usage (tenant_id, day, questions)
VALUES (app_tenant(), @day, 1)
ON CONFLICT (tenant_id, day) DO UPDATE SET questions = assistant_usage.questions + 1
WHERE assistant_usage.questions < @daily_limit::int
RETURNING questions;

-- name: AddAssistantTokens :exec
UPDATE assistant_usage SET input_tokens = input_tokens + @input_tokens, output_tokens = output_tokens + @output_tokens
WHERE tenant_id = app_tenant() AND day = @day;

-- name: GetAssistantUsage :one
SELECT * FROM assistant_usage WHERE day = @day;
