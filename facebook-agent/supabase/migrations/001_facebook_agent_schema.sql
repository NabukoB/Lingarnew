-- facebook-agent: Facebook Content Generation & Scheduling Agent (Phase 1)
-- Shares the fundiOps Supabase project. Assumes fundiOps' 001_fundiops_schema.sql
-- has already run (defines update_updated_at()); it is reused here, not redefined.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- ENUMS
-- ────────────────────────────────────────────────────────────

CREATE TYPE fb_post_slot AS ENUM (
  'construction_tip', 'material_prices', 'project_showcase'
);

CREATE TYPE fb_post_status AS ENUM (
  'draft', 'scheduled', 'posted', 'failed'
);

CREATE TYPE fb_topic_status AS ENUM (
  'proposed', 'approved', 'used', 'rejected'
);

CREATE TYPE fb_source_reliability AS ENUM ('high', 'medium', 'low');

CREATE TYPE fb_error_stage AS ENUM (
  'research', 'generation', 'publishing', 'analytics'
);

CREATE TYPE fb_error_severity AS ENUM ('warning', 'error', 'critical');

-- ────────────────────────────────────────────────────────────
-- FACEBOOK_TOPICS
-- ────────────────────────────────────────────────────────────

CREATE TABLE facebook_topics (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot        fb_post_slot NOT NULL,
  title       TEXT NOT NULL,
  summary     TEXT,
  status      fb_topic_status NOT NULL DEFAULT 'proposed',
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX facebook_topics_slot_status_idx ON facebook_topics(slot, status);
CREATE INDEX facebook_topics_used_at_idx     ON facebook_topics(used_at DESC) WHERE used_at IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- FACEBOOK_SOURCES
-- One row per verified reference backing a topic's claims
-- ────────────────────────────────────────────────────────────

CREATE TABLE facebook_sources (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id     UUID NOT NULL REFERENCES facebook_topics(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  title        TEXT,
  publisher    TEXT,
  reliability  fb_source_reliability NOT NULL DEFAULT 'medium',
  notes        TEXT,
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX facebook_sources_topic_idx ON facebook_sources(topic_id);

-- ────────────────────────────────────────────────────────────
-- FACEBOOK_POSTS
-- ────────────────────────────────────────────────────────────

CREATE TABLE facebook_posts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id       UUID REFERENCES facebook_topics(id) ON DELETE SET NULL,
  slot           fb_post_slot NOT NULL,
  status         fb_post_status NOT NULL DEFAULT 'draft',
  content        TEXT NOT NULL,
  hashtags       TEXT[] NOT NULL DEFAULT '{}',
  image_prompt   TEXT,                 -- Phase 2 placeholder
  image_url      TEXT,                 -- Phase 2 placeholder
  fb_post_id     TEXT,                 -- Graph API returned id, e.g. "{page_id}_{post_id}"
  permalink_url  TEXT,
  scheduled_for  TIMESTAMPTZ,
  posted_at      TIMESTAMPTZ,
  error_message  TEXT,
  retry_count    INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX facebook_posts_slot_posted_idx ON facebook_posts(slot, posted_at DESC);
CREATE INDEX facebook_posts_status_idx      ON facebook_posts(status);

-- ────────────────────────────────────────────────────────────
-- FACEBOOK_ANALYTICS
-- ────────────────────────────────────────────────────────────

CREATE TABLE facebook_analytics (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id       UUID NOT NULL REFERENCES facebook_posts(id) ON DELETE CASCADE,
  impressions   INT,
  engaged_users INT,
  reactions     INT,
  comments      INT,
  shares        INT,
  clicks        INT,
  collected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw           JSONB
);

CREATE INDEX facebook_analytics_post_idx ON facebook_analytics(post_id, collected_at DESC);

-- ────────────────────────────────────────────────────────────
-- FACEBOOK_ERRORS
-- ────────────────────────────────────────────────────────────

CREATE TABLE facebook_errors (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage      fb_error_stage NOT NULL,
  severity   fb_error_severity NOT NULL DEFAULT 'error',
  message    TEXT NOT NULL,
  context    JSONB,
  resolved   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX facebook_errors_unresolved_idx ON facebook_errors(created_at DESC) WHERE resolved = FALSE;

-- ────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGERS (reuses fundiOps' update_updated_at())
-- ────────────────────────────────────────────────────────────

CREATE TRIGGER facebook_topics_updated_at
  BEFORE UPDATE ON facebook_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER facebook_posts_updated_at
  BEFORE UPDATE ON facebook_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- These tables are single-tenant/global (one Facebook Page, no
-- per-end-user ownership column), unlike fundiOps' auth.uid()-scoped
-- tables. Enable RLS with a read-only policy for `authenticated`
-- (future dashboard, fast-follow) and no write policy — writes only
-- ever happen via the service_role client in scripts/supabase.sh,
-- which bypasses RLS by default.
-- ────────────────────────────────────────────────────────────

ALTER TABLE facebook_topics    ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_sources   ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_errors    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "facebook_topics_read"    ON facebook_topics    FOR SELECT USING (true);
CREATE POLICY "facebook_sources_read"   ON facebook_sources   FOR SELECT USING (true);
CREATE POLICY "facebook_posts_read"     ON facebook_posts     FOR SELECT USING (true);
CREATE POLICY "facebook_analytics_read" ON facebook_analytics FOR SELECT USING (true);
CREATE POLICY "facebook_errors_read"    ON facebook_errors    FOR SELECT USING (true);
