package mikrotikmock_test

import (
	"context"
	"net/http/httptest"
	"testing"

	"github.com/nabukob/lingarnew/wisp-saas/internal/routeros"
	mikrotikmock "github.com/nabukob/lingarnew/wisp-saas/mocks/mikrotik-mock"
)

func TestClientAgainstMock(t *testing.T) {
	m := mikrotikmock.New("u", "p")
	srv := httptest.NewServer(m)
	defer srv.Close()
	ctx := context.Background()
	c := routeros.NewClient(srv.URL, "u", "p", true)

	res, err := c.Resource(ctx)
	if err != nil || res.BoardName != "hAP ax3" || res.CPULoad != 12 {
		t.Fatalf("resource = %+v, %v", res, err)
	}
	if s := c.Serial(ctx); s != "HE10A1B2C3D" {
		t.Fatalf("serial %q", s)
	}

	changed, err := c.Ensure(ctx, "ip/hotspot/walled-garden", map[string]string{"dst-host": "portal.example.com"}, routeros.Record{"action": "allow", "comment": "wisp-saas"})
	if err != nil || !changed {
		t.Fatalf("ensure create: %v %v", changed, err)
	}
	changed, err = c.Ensure(ctx, "ip/hotspot/walled-garden", map[string]string{"dst-host": "portal.example.com"}, routeros.Record{"action": "allow", "comment": "wisp-saas"})
	if err != nil || changed {
		t.Fatalf("ensure no-op: %v %v", changed, err)
	}
	changed, _ = c.Ensure(ctx, "ip/hotspot/walled-garden", map[string]string{"dst-host": "portal.example.com"}, routeros.Record{"action": "deny"})
	if !changed || m.Rows("ip/hotspot/walled-garden")[0]["action"] != "deny" {
		t.Fatal("ensure patch failed")
	}

	m.Seed("ppp/active", mikrotikmock.Record{"name": "JZM1042"})
	rows, _ := c.List(ctx, "ppp/active", map[string]string{"name": "JZM1042"})
	if len(rows) != 1 {
		t.Fatalf("rows = %v", rows)
	}
	if err := c.Command(ctx, "ppp/active/remove", routeros.Record{".id": rows[0].ID()}); err != nil {
		t.Fatal(err)
	}
	if len(m.Rows("ppp/active")) != 0 {
		t.Fatal("session not removed")
	}

	if _, err := c.Get(ctx, "ip/pool/*99"); !routeros.IsNotFound(err) {
		t.Fatalf("want 404, got %v", err)
	}
	bad := routeros.NewClient(srv.URL, "u", "wrong", true)
	if _, err := bad.Resource(ctx); !routeros.Unauthorized(err) {
		t.Fatalf("want 401, got %v", err)
	}
	m.Down = true
	if _, err := c.Resource(ctx); err == nil {
		t.Fatal("want error when down")
	}
	dead := routeros.NewClient("http://127.0.0.1:1", "u", "p", true)
	if _, err := dead.Resource(ctx); !routeros.Unreachable(err) {
		t.Fatalf("want unreachable, got %v", err)
	}
}

func TestRateLimit(t *testing.T) {
	cases := map[[2]int32]string{{2000, 5000}: "2M/5M", {512, 2000}: "512k/2M", {1500, 10000}: "1500k/10M"}
	for in, want := range cases {
		if got := routeros.RateLimit(in[0], in[1]); got != want {
			t.Errorf("RateLimit(%v) = %s, want %s", in, got, want)
		}
	}
}
