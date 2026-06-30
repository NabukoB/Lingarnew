-- Fix: 001_fundiops_schema.sql enabled RLS on all CRM tables but never
-- granted the underlying table privileges. RLS policies only filter rows;
-- without a GRANT, Postgres rejects access before policies are even
-- evaluated (42501 permission denied), which is why the webhook's
-- service_role client could not write to wa_contacts.

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.profiles,
  public.wa_contacts,
  public.wa_messages,
  public.crm_leads,
  public.crm_follow_ups,
  public.crm_settings
TO service_role, authenticated;

GRANT EXECUTE ON FUNCTION public.get_pending_follow_ups(TIMESTAMPTZ) TO service_role;
