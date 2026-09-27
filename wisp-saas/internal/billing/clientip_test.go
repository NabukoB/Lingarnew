package billing

import (
	"net/http/httptest"
	"testing"

	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/config"
)

func TestClientIP(t *testing.T) {
	r := httptest.NewRequest("POST", "/", nil)
	r.RemoteAddr = "10.0.0.5:4321"
	r.Header.Set("X-Forwarded-For", "196.201.214.200, 41.90.1.2")
	r.Header.Set("CF-Connecting-IP", "196.201.214.200")

	if got := (&Service{}).ClientIP(r); got != "10.0.0.5" {
		t.Fatalf("no proxy trust: %s", got)
	}
	// A spoofed first entry must not win: the proxy appended the real caller last.
	if got := (&Service{Cfg: config.Config{TrustProxyHeaders: true}}).ClientIP(r); got != "41.90.1.2" {
		t.Fatalf("behind proxy: %s", got)
	}
	if got := (&Service{Cfg: config.Config{TrustProxyHeaders: true, TrustCloudflare: true}}).ClientIP(r); got != "196.201.214.200" {
		t.Fatalf("behind cloudflare: %s", got)
	}
	r6 := httptest.NewRequest("POST", "/", nil)
	r6.RemoteAddr = "[2001:db8::1]:443"
	if got := (&Service{}).ClientIP(r6); got != "2001:db8::1" {
		t.Fatalf("ipv6: %s", got)
	}
}
