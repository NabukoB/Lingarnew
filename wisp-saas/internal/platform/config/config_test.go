package config

import (
	"strings"
	"testing"
)

func TestLoadAndRequire(t *testing.T) {
	t.Setenv("WG_TUNNEL_CIDR", "10.200.5.9/16")
	t.Setenv("MPESA_ALLOWED_IPS", "196.201.214.200, 196.201.214.0/24")
	t.Setenv("SUBSCRIPTION_PRICE_KES", "2000")
	t.Setenv("DATABASE_URL", "")
	c, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if c.WGTunnelCIDR.String() != "10.200.0.0/16" || len(c.MpesaAllowedIPs) != 2 || c.MpesaAllowedIPs[0].Bits() != 32 || c.SubscriptionPrice != 200000 {
		t.Fatalf("config = %+v", c)
	}
	err = c.RequireFor("radius")
	if err == nil || !strings.Contains(err.Error(), "DATABASE_URL") || !strings.Contains(err.Error(), "RADIUS_API_TOKEN") {
		t.Fatalf("require = %v", err)
	}
	c.DatabaseURL, c.WGServerPrivateKey = "postgres://x", "k"
	if err := c.RequireFor("wg-gateway"); err != nil {
		t.Fatalf("wg-gateway needs no KEK: %v", err)
	}
	t.Setenv("MPESA_ALLOWED_IPS", "not-an-ip")
	if _, err := Load(); err == nil {
		t.Fatal("bad IP must fail")
	}
}
