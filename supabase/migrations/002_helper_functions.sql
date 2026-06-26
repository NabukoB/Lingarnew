-- Atomic counter increments for source tracking.
-- Using functions avoids read-modify-write races in the application layer.

CREATE OR REPLACE FUNCTION increment_source_send_count(p_source_id UUID)
RETURNS VOID LANGUAGE SQL AS $$
  UPDATE sources
  SET send_count = send_count + 1, last_seen_at = NOW()
  WHERE id = p_source_id;
$$;

CREATE OR REPLACE FUNCTION increment_source_useful_count(p_source_id UUID)
RETURNS VOID LANGUAGE SQL AS $$
  UPDATE sources
  SET useful_count = useful_count + 1
  WHERE id = p_source_id;
$$;

CREATE OR REPLACE FUNCTION increment_source_ignored_count(p_source_id UUID)
RETURNS VOID LANGUAGE SQL AS $$
  UPDATE sources
  SET ignored_count = ignored_count + 1
  WHERE id = p_source_id;
$$;

-- Flag sources that deliver low signal. Called by the daily cron.
-- Threshold: useful_count / send_count < 0.2 after at least 5 emails.
CREATE OR REPLACE FUNCTION update_unsubscribe_suggestions()
RETURNS VOID LANGUAGE SQL AS $$
  UPDATE sources
  SET unsubscribe_suggested = TRUE
  WHERE send_count >= 5
    AND (useful_count::FLOAT / NULLIF(send_count, 0)) < 0.2
    AND unsubscribe_suggested = FALSE;
$$;
