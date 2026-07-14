-- Fix (learned from fundiOps' 002_grants.sql): RLS policies only filter
-- rows post-authorization. Without explicit GRANTs, Postgres rejects
-- access before policies are evaluated (42501 permission denied), so
-- service_role writes and any future authenticated reads would fail
-- without this.

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.facebook_topics,
  public.facebook_sources,
  public.facebook_posts,
  public.facebook_analytics,
  public.facebook_errors
TO service_role;

GRANT SELECT ON
  public.facebook_topics,
  public.facebook_sources,
  public.facebook_posts,
  public.facebook_analytics,
  public.facebook_errors
TO authenticated;
