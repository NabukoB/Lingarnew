-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- PROFILES
-- Extends Supabase auth.users. Created on first sign-in.
-- ============================================================
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  ingest_email    TEXT UNIQUE NOT NULL,
  display_name    TEXT,
  goals           TEXT[] NOT NULL DEFAULT '{}',
  interests       TEXT[] NOT NULL DEFAULT '{}',
  plan            TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'executive')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SOURCES
-- One row per unique sender email, per user.
-- Tracks signal quality for the anti-newsletter feature.
-- ============================================================
CREATE TABLE sources (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_email            TEXT NOT NULL,
  from_name             TEXT,
  send_count            INTEGER NOT NULL DEFAULT 0,
  useful_count          INTEGER NOT NULL DEFAULT 0,
  ignored_count         INTEGER NOT NULL DEFAULT 0,
  unsubscribe_suggested BOOLEAN NOT NULL DEFAULT FALSE,
  first_seen_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, from_email)
);

-- ============================================================
-- RAW_EMAILS
-- Stores the original inbound email. AI processing happens
-- asynchronously; processed=false is the dead-letter queue.
-- ============================================================
CREATE TABLE raw_emails (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_id            UUID REFERENCES sources(id) ON DELETE SET NULL,
  mailgun_message_id   TEXT,
  from_email           TEXT NOT NULL,
  from_name            TEXT,
  subject              TEXT,
  body_text            TEXT,
  body_html            TEXT,
  received_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed            BOOLEAN NOT NULL DEFAULT FALSE,
  processing_error     TEXT
);

-- ============================================================
-- INSIGHTS
-- Structured knowledge extracted from a single email.
-- embedding: 1536-dim vector from text-embedding-3-small.
-- ============================================================
CREATE TABLE insights (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email_id        UUID NOT NULL REFERENCES raw_emails(id) ON DELETE CASCADE,
  source_id       UUID REFERENCES sources(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  summary         TEXT NOT NULL,
  relevance_score FLOAT NOT NULL,
  why_it_matters  TEXT,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  embedding       VECTOR(1536),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX insights_embedding_idx
  ON insights USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX insights_user_created_idx ON insights(user_id, created_at DESC);

-- ============================================================
-- GHOST_NOTES
-- The product differentiator. AI-synthesized notes connecting
-- new insights to the user's accumulated knowledge history.
-- Only notes with confidence_score >= 0.6 are shown.
-- ============================================================
CREATE TYPE ghost_note_type AS ENUM ('connection', 'contradiction', 'opportunity');

CREATE TABLE ghost_notes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trigger_insight_id  UUID NOT NULL REFERENCES insights(id) ON DELETE CASCADE,
  related_insight_ids UUID[] NOT NULL DEFAULT '{}',
  note_type           ghost_note_type NOT NULL,
  title               TEXT NOT NULL,
  body                TEXT NOT NULL,
  confidence_score    FLOAT NOT NULL,
  embedding           VECTOR(1536),
  included_in_digest  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ghost_notes_embedding_idx
  ON ghost_notes USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX ghost_notes_user_created_idx ON ghost_notes(user_id, created_at DESC);

-- ============================================================
-- DIGESTS
-- One row per user per day. insight_ids and ghost_note_ids
-- are ordered by relevance/confidence score.
-- ============================================================
CREATE TABLE digests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date           DATE NOT NULL,
  slug           TEXT NOT NULL,
  insight_ids    UUID[] NOT NULL DEFAULT '{}',
  ghost_note_ids UUID[] NOT NULL DEFAULT '{}',
  headline       TEXT,
  generated_at   TIMESTAMPTZ,
  UNIQUE(user_id, date)
);

CREATE INDEX digests_user_date_idx ON digests(user_id, date DESC);

-- ============================================================
-- SYNTHESIS_QUERIES
-- Logs natural-language queries against the Ghost Note index.
-- ============================================================
CREATE TABLE synthesis_queries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  query_text      TEXT NOT NULL,
  result_note_ids UUID[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- All user-data tables: users see only their own rows.
-- Service-role key bypasses RLS for webhook handlers.
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghost_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthesis_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_self"         ON profiles         FOR ALL USING (id = auth.uid());
CREATE POLICY "sources_self"          ON sources          FOR ALL USING (user_id = auth.uid());
CREATE POLICY "raw_emails_self"       ON raw_emails       FOR ALL USING (user_id = auth.uid());
CREATE POLICY "insights_self"         ON insights         FOR ALL USING (user_id = auth.uid());
CREATE POLICY "ghost_notes_self"      ON ghost_notes      FOR ALL USING (user_id = auth.uid());
CREATE POLICY "digests_self"          ON digests          FOR ALL USING (user_id = auth.uid());
CREATE POLICY "synthesis_queries_self" ON synthesis_queries FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- VECTOR SEARCH FUNCTIONS
-- Called via supabase.rpc() from the application layer.
-- ============================================================

-- Find insights similar to a query embedding
CREATE OR REPLACE FUNCTION match_insights(
  query_embedding   VECTOR(1536),
  match_threshold   FLOAT,
  match_count       INT,
  filter_user_id    UUID
)
RETURNS TABLE (
  id              UUID,
  title           TEXT,
  summary         TEXT,
  why_it_matters  TEXT,
  tags            TEXT[],
  created_at      TIMESTAMPTZ,
  similarity      FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    id, title, summary, why_it_matters, tags, created_at,
    1 - (embedding <=> query_embedding) AS similarity
  FROM insights
  WHERE user_id = filter_user_id
    AND embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Find ghost notes similar to a query embedding (synthesis layer)
CREATE OR REPLACE FUNCTION match_ghost_notes(
  query_embedding   VECTOR(1536),
  match_threshold   FLOAT,
  match_count       INT,
  filter_user_id    UUID
)
RETURNS TABLE (
  id              UUID,
  note_type       ghost_note_type,
  title           TEXT,
  body            TEXT,
  confidence_score FLOAT,
  created_at      TIMESTAMPTZ,
  similarity      FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    id, note_type, title, body, confidence_score, created_at,
    1 - (embedding <=> query_embedding) AS similarity
  FROM ghost_notes
  WHERE user_id = filter_user_id
    AND embedding IS NOT NULL
    AND confidence_score >= 0.6
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
