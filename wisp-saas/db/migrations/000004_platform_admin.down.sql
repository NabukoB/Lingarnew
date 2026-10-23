DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['tenants', 'subscribers', 'routers', 'auth_sessions', 'locations', 'plans', 'mpesa_transactions',
                             'sms_messages', 'config_audit', 'router_metrics', 'assistant_usage']
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS platform_read ON %I', t);
        EXECUTE format('REVOKE ALL ON %I FROM wisp_platform', t);
    END LOOP;
END
$$;
DROP POLICY IF EXISTS platform_write ON tenants;
DROP TABLE IF EXISTS admin_audit, admin_sessions, platform_admins;
-- The wisp_platform role is left in place (roles are cluster-wide; other databases may use it).
