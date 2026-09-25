DROP FUNCTION IF EXISTS wireguard_peers(), router_targets(), active_tenant_ids(), allocate_tunnel_ip(CIDR),
    onboarding_token_lookup(BYTEA), router_by_tunnel_ip(INET), tenant_identity_taken(TEXT, TEXT, TEXT),
    tenant_by_portal_domain(TEXT), tenant_by_slug(TEXT), auth_session_tenant(BYTEA), tenant_login(TEXT);
DROP TABLE IF EXISTS sms_messages, config_audit, sessions, mpesa_transactions, hotspot_purchases, vouchers,
    subscribers, plans, onboarding_tokens, routers, locations, auth_sessions, tenants CASCADE;
DROP FUNCTION IF EXISTS app_tenant();
