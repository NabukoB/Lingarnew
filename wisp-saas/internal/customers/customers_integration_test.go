package customers

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil/fixtures"
)

type fakeDisconnector struct {
	mu    sync.Mutex
	calls []string
	err   error
}

func (f *fakeDisconnector) Disconnect(_ context.Context, _ uuid.UUID, username, _ string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.calls = append(f.calls, username)
	return f.err
}

func setup(t *testing.T) (*Service, *fakeDisconnector, uuid.UUID, string) {
	d := testutil.DB(t)
	sealer := testutil.Sealer(t)
	tn := fixtures.Tenant(t, d, sealer, "Jazmoge WiFi")
	fd := &fakeDisconnector{}
	return &Service{DB: d, Sealer: sealer, Disconnector: fd}, fd, tn.ID, tn.AccountPrefix
}

func TestCreateSubscriberAssignsAccountIDsAndEncryptsPassword(t *testing.T) {
	s, _, tid, prefix := setup(t)
	ctx := context.Background()
	plan := fixtures.Plan(t, s.DB, tid, "pppoe", "Bronze 5 Mbps")

	a, pwA, err := s.CreateSubscriber(ctx, tid, SubscriberInput{FullName: "Mary Wanjiku", Phone: "0712 345 678", PlanID: &plan.ID, StartNow: true})
	if err != nil {
		t.Fatal(err)
	}
	b, _, err := s.CreateSubscriber(ctx, tid, SubscriberInput{FullName: "Peter Otieno", Phone: "0722118430", PlanID: &plan.ID, Password: "chosen-pw"})
	if err != nil {
		t.Fatal(err)
	}
	if a.PppoeUsername != prefix+"1000" || b.PppoeUsername != prefix+"1001" {
		t.Fatalf("account IDs %s, %s", a.PppoeUsername, b.PppoeUsername)
	}
	if a.Status != "active" || a.NextRenewalAt.Before(time.Now().Add(29*24*time.Hour)) {
		t.Fatalf("start_now subscriber: %+v", a)
	}
	if b.Status != "expired" {
		t.Fatalf("unpaid subscriber should wait for payment, got %s", b.Status)
	}
	if strings.Contains(string(a.PppoePasswordEnc), pwA) {
		t.Fatal("password stored in plaintext")
	}
	got, err := s.Password(ctx, tid, a.ID)
	if err != nil || got != pwA {
		t.Fatalf("Password() = %q, %v; want %q", got, err, pwA)
	}
	if got, _ := s.Password(ctx, tid, b.ID); got != "chosen-pw" {
		t.Fatalf("chosen password = %q", got)
	}

	rows, counts, err := s.ListSubscribers(ctx, tid, ListFilter{Query: "0712345678"})
	if err != nil || len(rows) != 1 || rows[0].ID != a.ID {
		t.Fatalf("search by phone: %d rows, %v", len(rows), err)
	}
	if counts["all"] != 2 || counts["active"] != 1 || counts["expired"] != 1 {
		t.Fatalf("counts %v", counts)
	}
}

func TestCreateSubscriberValidation(t *testing.T) {
	s, _, tid, _ := setup(t)
	ctx := context.Background()
	hot := fixtures.Plan(t, s.DB, tid, "hotspot", "1 day")
	var he *httpx.Error
	_, _, err := s.CreateSubscriber(ctx, tid, SubscriberInput{FullName: "X Y", Phone: "0812345678"})
	if !errors.As(err, &he) || he.Code != "INVALID_PHONE" {
		t.Fatalf("bad phone: %v", err)
	}
	_, _, err = s.CreateSubscriber(ctx, tid, SubscriberInput{FullName: "X Y", Phone: "0712345678", PlanID: &hot.ID})
	if !errors.As(err, &he) || he.Code != "INVALID_PLAN" {
		t.Fatalf("hotspot plan for PPPoE: %v", err)
	}
}

func TestSuspendDisconnectsAndReactivateNeedsPayment(t *testing.T) {
	s, fd, tid, _ := setup(t)
	ctx := context.Background()
	plan := fixtures.Plan(t, s.DB, tid, "pppoe", "")
	sub, _, err := s.CreateSubscriber(ctx, tid, SubscriberInput{FullName: "Faith Njeri", Phone: "0714330981", PlanID: &plan.ID, StartNow: true})
	if err != nil {
		t.Fatal(err)
	}
	got, err := s.SetStatus(ctx, tid, sub.ID, "suspended")
	if err != nil || got.Status != "suspended" {
		t.Fatalf("suspend: %v %v", got.Status, err)
	}
	if len(fd.calls) != 1 || fd.calls[0] != sub.PppoeUsername {
		t.Fatalf("disconnect calls %v", fd.calls)
	}
	got, err = s.SetStatus(ctx, tid, sub.ID, "active")
	if err != nil || got.Status != "active" {
		t.Fatalf("reactivate paid-up: %v %v", got.Status, err)
	}

	unpaid, _, _ := s.CreateSubscriber(ctx, tid, SubscriberInput{FullName: "Lucy W", Phone: "0745208117", PlanID: &plan.ID})
	got, err = s.SetStatus(ctx, tid, unpaid.ID, "active")
	if err != nil || got.Status != "expired" {
		t.Fatalf("reactivate unpaid should stay expired: %v %v", got.Status, err)
	}

	fd.err = errors.New("router down")
	_, err = s.SetStatus(ctx, tid, sub.ID, "cancelled")
	var he *httpx.Error
	if !errors.As(err, &he) || he.Code != "DISCONNECT_FAILED" {
		t.Fatalf("disconnect failure should be reported: %v", err)
	}
	if _, err := s.SetStatus(ctx, tid, sub.ID, "active"); err == nil {
		t.Fatal("cancelled subscriber was reactivated")
	}
}

func TestPlansAndVouchers(t *testing.T) {
	s, _, tid, _ := setup(t)
	ctx := context.Background()
	mins := int32(15)
	trial, err := s.CreatePlan(ctx, tid, PlanInput{Name: "Free 15 min", AccessType: "hotspot", IsTrial: true, DurationMinutes: &mins, BandwidthDownKbps: 2000, BandwidthUpKbps: 1000})
	if err != nil {
		t.Fatal(err)
	}
	if trial.PriceCents != 0 || !trial.IsTrial {
		t.Fatalf("trial plan %+v", trial)
	}
	if _, err := s.CreatePlan(ctx, tid, PlanInput{Name: "Bad", AccessType: "pppoe", PriceKES: 100, BandwidthDownKbps: 1000, BandwidthUpKbps: 1000}); err == nil {
		t.Fatal("PPPoE plan without days accepted")
	}
	off := false
	upd, err := s.UpdatePlan(ctx, tid, trial.ID, PlanInput{Name: "Free 15 min", IsTrial: true, DurationMinutes: &mins, BandwidthDownKbps: 2000, BandwidthUpKbps: 1000, IsActive: &off})
	if err != nil || upd.IsActive {
		t.Fatalf("deactivate: %+v %v", upd, err)
	}

	day := fixtures.Plan(t, s.DB, tid, "hotspot", "1 day")
	vs, err := s.CreateVouchers(ctx, tid, day.ID, 25, "Shop A")
	if err != nil || len(vs) != 25 {
		t.Fatalf("vouchers: %d %v", len(vs), err)
	}
	seen := map[string]bool{}
	for _, v := range vs {
		if len(v.Code) != 8 || seen[v.Code] || strings.ContainsAny(v.Code, "01IO") {
			t.Fatalf("bad or duplicate code %q", v.Code)
		}
		seen[v.Code] = true
	}
	list, err := s.ListVouchers(ctx, tid, "Shop A", 0)
	if err != nil || len(list) != 25 {
		t.Fatalf("list vouchers: %d %v", len(list), err)
	}
	pppoe := fixtures.Plan(t, s.DB, tid, "pppoe", "")
	if _, err := s.CreateVouchers(ctx, tid, pppoe.ID, 1, ""); err == nil {
		t.Fatal("voucher for PPPoE plan accepted")
	}
}
