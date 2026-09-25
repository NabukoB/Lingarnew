package router_test

import (
	"context"
	"net/http/httptest"
	"net/netip"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/config"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/router"
	"github.com/nabukob/lingarnew/wisp-saas/internal/routeros"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil/fixtures"
	mikrotikmock "github.com/nabukob/lingarnew/wisp-saas/mocks/mikrotik-mock"
)

type alerts struct {
	mu    sync.Mutex
	names []string
}

func (a *alerts) RouterOffline(_ context.Context, _ uuid.UUID, name string, _ time.Time) {
	a.mu.Lock()
	a.names = append(a.names, name)
	a.mu.Unlock()
}

const serverKey = "c2VydmVyLXB1YmxpYy1rZXktMzItYnl0ZXMtbG9uZyE="

func setup(t *testing.T) (*router.Service, *mikrotikmock.Router, *alerts, store.Tenant, uuid.UUID) {
	d := testutil.DB(t)
	sealer := testutil.Sealer(t)
	tn := fixtures.Tenant(t, d, sealer, "Router Test WiFi")
	var loc uuid.UUID
	_ = d.WithTenant(context.Background(), tn.ID, func(q *store.Queries) error {
		ls, err := q.ListLocations(context.Background())
		loc = ls[0].ID
		return err
	})
	mock := mikrotikmock.New("wisp-api", "unset")
	srv := httptest.NewServer(mock)
	t.Cleanup(srv.Close)
	al := &alerts{}
	cfg := config.Config{
		PublicAPIURL: "https://api.example.com", PortalBaseURL: "https://portal.example.com",
		WGTunnelCIDR: netip.MustParsePrefix("10.200.0.0/16"), WGServerPublicKey: serverKey,
		WGServerEndpoint: "vpn.example.com:51820", RadiusSecretSeed: "seed",
	}
	svc := &router.Service{DB: d, Sealer: sealer, Cfg: cfg, Alerter: al,
		Dial: func(r store.Router, pw string) *routeros.Client {
			mock.Password = pw // the script created this user on the router
			return routeros.NewClient(srv.URL, r.ApiUser, pw, true)
		}}
	return svc, mock, al, tn, loc
}

func tokenOf(t *testing.T, cmd string) string {
	i := strings.Index(cmd, "/onboard/")
	j := strings.Index(cmd[i:], `"`)
	if i < 0 || j < 0 {
		t.Fatalf("no token in %q", cmd)
	}
	return cmd[i+len("/onboard/") : i+j]
}

func TestOnboardingPollAndSync(t *testing.T) {
	svc, mock, al, tn, loc := setup(t)
	ctx := context.Background()

	if _, _, err := svc.Create(ctx, tn.ID, router.CreateInput{LocationID: loc, Name: "Ruiru Mast", PPPoEPorts: []string{"ether2"}, HotspotPorts: []string{"ether2"}}); err == nil {
		t.Fatal("same port twice must fail")
	}
	rt, setup, err := svc.Create(ctx, tn.ID, router.CreateInput{LocationID: loc, Name: "Ruiru Mast", PPPoEPorts: []string{"ether2"}, HotspotPorts: []string{"ether3", "wlan1"}})
	if err != nil {
		t.Fatal(err)
	}
	if rt.Status != "pending" || !strings.HasPrefix(rt.TunnelIp.String(), "10.200.") || rt.TunnelIp.String() == "10.200.0.1" {
		t.Fatalf("router = %+v", rt)
	}
	rt2, _, err := svc.Create(ctx, tn.ID, router.CreateInput{LocationID: loc, Name: "Second", HotspotPorts: []string{"ether2"}})
	if err != nil || rt2.TunnelIp == rt.TunnelIp {
		t.Fatalf("second router ip %v (%v)", rt2.TunnelIp, err)
	}
	if !strings.HasPrefix(setup.Command, `/tool fetch url="https://api.example.com/onboard/`) || !strings.Contains(setup.Command, "/import file-name=wisp-setup.rsc") {
		t.Fatalf("command = %s", setup.Command)
	}
	token := tokenOf(t, setup.Command)

	script := svc.Script(ctx, token)
	if !strings.Contains(script, "address="+rt.TunnelIp.String()+"/32 network=10.200.0.1") || !strings.Contains(script, router.RadiusSecret("seed", rt.ID)) {
		t.Fatalf("script lacks router values:\n%s", script[:400])
	}
	if !strings.Contains(script, `/ip hotspot walled-garden add dst-host="portal.example.com"`) {
		t.Fatal("walled garden missing")
	}
	if s := svc.Script(ctx, "nope"); !strings.HasPrefix(s, ":error") {
		t.Fatalf("bad token should give an error script, got %q", s)
	}
	page, err := svc.HotspotFile(ctx, token, "login.html")
	if err != nil || !strings.Contains(string(page), "https://portal.example.com/?t="+tn.Slug) || !strings.Contains(string(page), rt.ID.String()) {
		t.Fatalf("login.html = %s (%v)", page, err)
	}

	pub := "cm91dGVyLXB1YmxpYy1rZXktMzItYnl0ZXMtbG9uZyE="
	if err := svc.Complete(ctx, token, router.CallbackInput{PublicKey: "bad"}); err == nil {
		t.Fatal("bad key accepted")
	}
	if err := svc.Complete(ctx, token, router.CallbackInput{PublicKey: pub, Serial: "HE10"}); err != nil {
		t.Fatal(err)
	}
	if err := svc.Complete(ctx, token, router.CallbackInput{PublicKey: pub}); err == nil {
		t.Fatal("token reused")
	}
	if s := svc.Script(ctx, token); !strings.Contains(s, "expired or was already used") {
		t.Fatalf("used token script = %q", s)
	}

	// The router's firewall rules and radius as the setup script leaves them.
	mock.Seed("ip/firewall/filter", mikrotikmock.Record{"chain": "input", "comment": "wisp-saas: cloud tunnel"})
	mock.Seed("ip/hotspot", mikrotikmock.Record{"name": "wisp-hotspot"})
	mock.Seed("interface/pppoe-server/server", mikrotikmock.Record{"service-name": "WISP-PPPoE"})

	// First poll: online, identity recorded, first sync pushes RADIUS + walled garden.
	if err := svc.PollAll(ctx); err != nil {
		t.Fatal(err)
	}
	var got store.Router
	_ = svc.DB.WithTenant(ctx, tn.ID, func(q *store.Queries) error {
		got, err = q.GetRouter(ctx, rt.ID)
		return err
	})
	if got.Status != "online" || got.BoardName == nil || *got.BoardName != "hAP ax3" || got.SerialNumber == nil || *got.SerialNumber != "HE10A1B2C3D" || got.LastConfigPush == nil {
		t.Fatalf("after poll: %+v", got)
	}
	rad := mock.Rows("radius")
	if len(rad) != 1 || rad[0]["secret"] != router.RadiusSecret("seed", rt.ID) || rad[0]["src-address"] != rt.TunnelIp.String() {
		t.Fatalf("radius = %v", rad)
	}
	if mock.Singleton("radius/incoming")["accept"] != "yes" {
		t.Fatal("CoA listener not enabled")
	}
	if len(mock.Rows("ip/hotspot/walled-garden")) != 2 { // portal + api host
		t.Fatalf("walled garden = %v", mock.Rows("ip/hotspot/walled-garden"))
	}

	changes, err := svc.Sync(ctx, tn.ID, rt.ID, "tenant:x")
	if err != nil || len(changes) != 0 {
		t.Fatalf("second sync should be a no-op: %v %v", changes, err)
	}

	items, err := svc.Checklist(ctx, tn.ID, rt.ID)
	if err != nil {
		t.Fatal(err)
	}
	for _, it := range items {
		if !it.OK {
			t.Errorf("checklist item %s not ok: %s", it.Key, it.Hint)
		}
	}

	mock.Seed("ppp/active", mikrotikmock.Record{"name": "RTW1000"}, mikrotikmock.Record{"name": "RTW1001"})
	if err := svc.Kick(ctx, tn.ID, rt.ID, "pppoe", "RTW1000"); err != nil {
		t.Fatal(err)
	}
	if rows := mock.Rows("ppp/active"); len(rows) != 1 || rows[0]["name"] != "RTW1001" {
		t.Fatalf("kick removed wrong session: %v", rows)
	}

	// Router drops off: 3 misses -> degraded, 10 -> offline + one alert.
	mock.Down = true
	for i := 1; i <= 11; i++ {
		_ = svc.Poll(ctx, tn.ID, rt.ID)
		_ = svc.DB.WithTenant(ctx, tn.ID, func(q *store.Queries) error {
			got, err = q.GetRouter(ctx, rt.ID)
			return err
		})
		want := "online"
		if i >= router.OfflineAfter {
			want = "offline"
		} else if i >= router.DegradedAfter {
			want = "degraded"
		}
		if got.Status != want {
			t.Fatalf("after %d misses status = %s, want %s", i, got.Status, want)
		}
	}
	if len(al.names) != 1 || al.names[0] != "Ruiru Mast" {
		t.Fatalf("alerts = %v", al.names)
	}
	if _, err := svc.Sync(ctx, tn.ID, rt.ID, "tenant:x"); err == nil {
		t.Fatal("sync to a down router must fail")
	} else if e, ok := err.(*httpx.Error); !ok || e.Code != "ROUTER_UNREACHABLE" {
		t.Fatalf("want ROUTER_UNREACHABLE, got %v", err)
	}
	mock.Down = false
	_ = svc.Poll(ctx, tn.ID, rt.ID)
	_ = svc.DB.WithTenant(ctx, tn.ID, func(q *store.Queries) error {
		got, err = q.GetRouter(ctx, rt.ID)
		audit, _ := q.ListConfigAudit(ctx, store.ListConfigAuditParams{RouterID: &rt.ID, Limit: 50})
		if len(audit) < 3 {
			t.Errorf("want audit rows for onboard + pushes, got %d", len(audit))
		}
		return err
	})
	if got.Status != "online" || got.MissedPolls != 0 {
		t.Fatalf("recovered status = %s/%d", got.Status, got.MissedPolls)
	}
}

func TestLapsedSubscriptionBlocksNewRouters(t *testing.T) {
	svc, _, _, tn, loc := setup(t)
	ctx := context.Background()
	past := time.Now().Add(-time.Hour)
	_ = svc.DB.WithTenant(ctx, tn.ID, func(q *store.Queries) error {
		return q.SetSubscription(ctx, store.SetSubscriptionParams{SubscriptionStatus: "lapsed", SubscriptionExpiresAt: &past})
	})
	_, _, err := svc.Create(ctx, tn.ID, router.CreateInput{LocationID: loc, Name: "X", HotspotPorts: []string{"ether2"}})
	if e, ok := err.(*httpx.Error); !ok || e.Code != "SUBSCRIPTION_EXPIRED" {
		t.Fatalf("want SUBSCRIPTION_EXPIRED, got %v", err)
	}
}
