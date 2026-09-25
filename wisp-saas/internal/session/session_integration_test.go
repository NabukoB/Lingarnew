package session_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"layeh.com/radius"

	"github.com/nabukob/lingarnew/wisp-saas/internal/billing"
	"github.com/nabukob/lingarnew/wisp-saas/internal/customers"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/config"
	"github.com/nabukob/lingarnew/wisp-saas/internal/router"
	"github.com/nabukob/lingarnew/wisp-saas/internal/routeros"
	"github.com/nabukob/lingarnew/wisp-saas/internal/session"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil/fixtures"
)

type kicker struct{ calls []string }

func (k *kicker) Kick(_ context.Context, _, routerID uuid.UUID, access, username string) error {
	k.calls = append(k.calls, access+":"+username)
	return nil
}

func attrs(kv ...any) session.Attrs {
	m := map[string]any{}
	for i := 0; i < len(kv); i += 2 {
		m[kv[i].(string)] = map[string]any{"type": "string", "value": []any{kv[i+1]}}
	}
	b, _ := json.Marshal(m)
	var a session.Attrs
	_ = json.Unmarshal(b, &a)
	return a
}

type world struct {
	svc    *session.Service
	cust   *customers.Service
	bill   *billing.Service
	tn     store.Tenant
	nas    netip.Addr
	rt     store.Router
	kicker *kicker
	coa    []string
	ack    bool
}

func newWorld(t *testing.T) *world {
	d := testutil.DB(t)
	sealer := testutil.Sealer(t)
	tn := fixtures.Tenant(t, d, sealer, "Radius WiFi")
	ctx := context.Background()
	rs := &router.Service{DB: d, Sealer: sealer, Cfg: config.Config{WGTunnelCIDR: netip.MustParsePrefix("10.200.0.0/16"), PublicAPIURL: "https://api.example.com"}}
	var loc uuid.UUID
	_ = d.WithTenant(ctx, tn.ID, func(q *store.Queries) error {
		ls, err := q.ListLocations(ctx)
		loc = ls[0].ID
		return err
	})
	rt, _, err := rs.Create(ctx, tn.ID, router.CreateInput{LocationID: loc, Name: "Tower", PPPoEPorts: []string{"ether2"}, HotspotPorts: []string{"ether3"}})
	if err != nil {
		t.Fatal(err)
	}
	w := &world{tn: tn, nas: rt.TunnelIp, rt: rt, kicker: &kicker{}, ack: true}
	w.svc = &session.Service{DB: d, Sealer: sealer, SecretSeed: "seed", Kicker: w.kicker,
		Exchange: func(_ context.Context, p *radius.Packet, addr string) (*radius.Packet, error) {
			w.coa = append(w.coa, addr)
			if !w.ack {
				return nil, errors.New("timeout")
			}
			return &radius.Packet{Code: radius.CodeDisconnectACK}, nil
		}}
	w.cust = &customers.Service{DB: d, Sealer: sealer, Disconnector: w.svc}
	w.bill = &billing.Service{DB: d}
	return w
}

func TestPPPoEAuthorizeAndAccounting(t *testing.T) {
	w := newWorld(t)
	ctx := context.Background()
	plan := fixtures.Plan(t, w.svc.DB, w.tn.ID, "pppoe", "")
	sub, pw, err := w.cust.CreateSubscriber(ctx, w.tn.ID, customers.SubscriberInput{FullName: "Jane", Phone: "0712000111", PlanID: &plan.ID, StartNow: true})
	if err != nil {
		t.Fatal(err)
	}

	r, err := w.svc.Authorize(ctx, w.nas, attrs("User-Name", strings.ToLower(sub.PppoeUsername)))
	if err != nil || r.Rejected() {
		t.Fatalf("authorize = %v %v", r, err)
	}
	if r["control:Cleartext-Password"] != pw || r["reply:Mikrotik-Rate-Limit"] != routeros.RateLimit(plan.BandwidthUpKbps, plan.BandwidthDownKbps) {
		t.Fatalf("reply = %v", r)
	}
	if to := r["reply:Session-Timeout"].(int64); to < 86000 || to > 86400 {
		t.Fatalf("timeout %d", to)
	}

	if r, _ := w.svc.Authorize(ctx, w.nas, attrs("User-Name", "NOPE1000")); !r.Rejected() || !strings.Contains(r.Message(), "Unknown account") {
		t.Fatalf("unknown = %v", r)
	}
	if r, _ := w.svc.Authorize(ctx, netip.MustParseAddr("10.200.9.9"), attrs("User-Name", sub.PppoeUsername)); !r.Rejected() {
		t.Fatal("unknown NAS must reject")
	}

	// Accounting lifecycle.
	for _, st := range []session.Attrs{
		attrs("Acct-Status-Type", "Start", "User-Name", sub.PppoeUsername, "Acct-Session-Id", "81a00001", "Framed-IP-Address", "172.21.0.10", "Calling-Station-Id", "AA:BB:CC:00:11:22"),
		attrs("Acct-Status-Type", "Interim-Update", "User-Name", sub.PppoeUsername, "Acct-Session-Id", "81a00001", "Acct-Input-Octets", 1000, "Acct-Output-Octets", 5000, "Acct-Output-Gigawords", 1, "Acct-Session-Time", 300),
	} {
		if err := w.svc.Accounting(ctx, w.nas, st); err != nil {
			t.Fatal(err)
		}
	}
	_ = w.svc.DB.WithTenant(ctx, w.tn.ID, func(q *store.Queries) error {
		s, err := q.GetActiveSession(ctx, store.GetActiveSessionParams{RouterID: w.rt.ID, AcctSessionID: "81a00001"})
		if err != nil || s.Status != "active" || s.BytesOut != 1<<32+5000 || s.PlanID == nil || *s.PlanID != plan.ID || s.IpAddress == nil {
			t.Fatalf("session = %+v %v", s, err)
		}
		return nil
	})

	// Suspending kicks the live session with CoA and writes an audit row.
	if _, err := w.cust.SetStatus(ctx, w.tn.ID, sub.ID, "suspended"); err != nil {
		t.Fatal(err)
	}
	if len(w.coa) != 1 || w.coa[0] != w.nas.String()+":3799" {
		t.Fatalf("coa = %v", w.coa)
	}
	r, _ = w.svc.Authorize(ctx, w.nas, attrs("User-Name", sub.PppoeUsername))
	if !r.Rejected() || !strings.Contains(r.Message(), "suspended") {
		t.Fatalf("suspended = %v", r)
	}

	// CoA fails -> REST fallback.
	w.ack = false
	if err := w.svc.Disconnect(ctx, w.tn.ID, sub.PppoeUsername, "test"); err != nil {
		t.Fatal(err)
	}
	if len(w.kicker.calls) != 1 || w.kicker.calls[0] != "pppoe:"+sub.PppoeUsername {
		t.Fatalf("kicks = %v", w.kicker.calls)
	}

	if err := w.svc.Accounting(ctx, w.nas, attrs("Acct-Status-Type", "Stop", "User-Name", sub.PppoeUsername, "Acct-Session-Id", "81a00001", "Acct-Terminate-Cause", "Admin-Reset")); err != nil {
		t.Fatal(err)
	}
	_ = w.svc.DB.WithTenant(ctx, w.tn.ID, func(q *store.Queries) error {
		s, _ := q.GetActiveSession(ctx, store.GetActiveSessionParams{RouterID: w.rt.ID, AcctSessionID: "81a00001"})
		if s.Status != "terminated" || s.TerminationCause == nil || *s.TerminationCause != "Admin-Reset" {
			t.Fatalf("stopped session = %+v", s)
		}
		audit, _ := q.ListConfigAudit(ctx, store.ListConfigAuditParams{RouterID: &w.rt.ID, Limit: 10})
		n := 0
		for _, a := range audit {
			if a.Action == "DISCONNECT_USER" {
				n++
			}
		}
		if n != 2 {
			t.Fatalf("want 2 disconnect audits, got %d", n)
		}
		return nil
	})
}

func TestExpiredPPPoEGetsPayMessage(t *testing.T) {
	w := newWorld(t)
	ctx := context.Background()
	plan := fixtures.Plan(t, w.svc.DB, w.tn.ID, "pppoe", "")
	sub, _, err := w.cust.CreateSubscriber(ctx, w.tn.ID, customers.SubscriberInput{FullName: "Late", Phone: "0712000222", PlanID: &plan.ID})
	if err != nil {
		t.Fatal(err)
	}
	r, _ := w.svc.Authorize(ctx, w.nas, attrs("User-Name", sub.PppoeUsername))
	want := fmt.Sprintf("Account expired. Pay via M-Pesa Paybill 123456, Account: %s", sub.PppoeUsername)
	if !r.Rejected() || r.Message() != want {
		t.Fatalf("got %v, want %q", r, want)
	}
}

func TestHotspotMACAuthorize(t *testing.T) {
	w := newWorld(t)
	ctx := context.Background()
	plan := fixtures.Plan(t, w.svc.DB, w.tn.ID, "hotspot", "")
	vs, err := w.cust.CreateVouchers(ctx, w.tn.ID, plan.ID, 1, "t")
	if err != nil {
		t.Fatal(err)
	}
	mac := "AA:BB:CC:DD:EE:01"
	if r, _ := w.svc.Authorize(ctx, w.nas, attrs("User-Name", mac)); !r.Rejected() || !strings.Contains(r.Message(), "No active package") {
		t.Fatalf("unpaid = %v", r)
	}
	if _, err := w.bill.RedeemVoucher(ctx, w.tn.ID, vs[0].Code, "aa-bb-cc-dd-ee-01", &w.rt.ID); err != nil {
		t.Fatal(err)
	}
	r, err := w.svc.Authorize(ctx, w.nas, attrs("User-Name", mac))
	if err != nil || r.Rejected() || r["control:Cleartext-Password"] != mac {
		t.Fatalf("paid = %v %v", r, err)
	}
	want := int64(*plan.DurationMinutes) * 60
	if to := r["reply:Session-Timeout"].(int64); to > want || to < want-60 {
		t.Fatalf("timeout %d, want ~%d", to, want)
	}
	if err := w.svc.Accounting(ctx, w.nas, attrs("Acct-Status-Type", "Start", "User-Name", mac, "Acct-Session-Id", "h1")); err != nil {
		t.Fatal(err)
	}
	if err := w.svc.Accounting(ctx, w.nas, attrs("Acct-Status-Type", "Accounting-On")); err != nil {
		t.Fatal(err)
	}
	_ = w.svc.DB.WithTenant(ctx, w.tn.ID, func(q *store.Queries) error {
		s, _ := q.GetActiveSession(ctx, store.GetActiveSessionParams{RouterID: w.rt.ID, AcctSessionID: "h1"})
		if s.AccessType != "hotspot" || s.Status != "terminated" {
			t.Fatalf("session after NAS reboot = %+v", s)
		}
		return nil
	})
}

func TestHandler(t *testing.T) {
	w := newWorld(t)
	srv := httptest.NewServer(w.svc.Handler("tok"))
	defer srv.Close()
	post := func(path, pass string, body string) *http.Response {
		req, _ := http.NewRequest(http.MethodPost, srv.URL+path, bytes.NewBufferString(body))
		req.SetBasicAuth("freeradius", pass)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		return resp
	}
	if resp := post("/radius/client?nas="+w.nas.String(), "wrong", ""); resp.StatusCode != 401 {
		t.Fatalf("bad token = %d", resp.StatusCode)
	}
	resp := post("/radius/client?nas="+w.nas.String(), "tok", "")
	var c map[string]string
	_ = json.NewDecoder(resp.Body).Decode(&c)
	if resp.StatusCode != 200 || c["control:FreeRADIUS-Client-Secret"] != router.RadiusSecret("seed", w.rt.ID) {
		t.Fatalf("client = %d %v", resp.StatusCode, c)
	}
	if resp := post("/radius/client?nas=10.200.99.99", "tok", ""); resp.StatusCode != 404 {
		t.Fatalf("unknown nas = %d", resp.StatusCode)
	}
	resp = post("/radius/authorize?nas="+w.nas.String(), "tok", `{"User-Name":{"type":"string","value":["XX1000"]}}`)
	var r map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&r)
	if resp.StatusCode != 200 || r["control:Auth-Type"] != "Reject" {
		t.Fatalf("authorize = %d %v", resp.StatusCode, r)
	}
	if resp := post("/radius/accounting?nas="+w.nas.String(), "tok", `{"Acct-Status-Type":{"type":"integer","value":["Accounting-On"]}}`); resp.StatusCode != 204 {
		t.Fatalf("accounting = %d", resp.StatusCode)
	}
	_ = time.Now
}
