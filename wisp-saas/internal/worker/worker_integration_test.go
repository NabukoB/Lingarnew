package worker_test

import (
	"context"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/nabukob/lingarnew/wisp-saas/internal/customers"
	"github.com/nabukob/lingarnew/wisp-saas/internal/sms"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil/fixtures"
	"github.com/nabukob/lingarnew/wisp-saas/internal/worker"
)

type outbox struct {
	mu   sync.Mutex
	msgs []string
}

func (o *outbox) Send(_ context.Context, to, body, _ string) (string, error) {
	o.mu.Lock()
	defer o.mu.Unlock()
	o.msgs = append(o.msgs, to+"|"+body)
	return "id", nil
}

type disc struct{ users []string }

func (d *disc) Disconnect(_ context.Context, _ uuid.UUID, u, _ string) error {
	d.users = append(d.users, u)
	return nil
}

func TestRenewalsRemindersAndExpiry(t *testing.T) {
	d := testutil.DB(t)
	sealer := testutil.Sealer(t)
	ctx := context.Background()
	tn := fixtures.Tenant(t, d, sealer, "Worker WiFi")
	box, dc := &outbox{}, &disc{}
	w := &worker.Worker{DB: d, SMS: &sms.Service{DB: d, Provider: box}, Disconnector: dc}
	cust := &customers.Service{DB: d, Sealer: sealer}
	plan := fixtures.Plan(t, d, tn.ID, "pppoe", "")

	mk := func(name, phone string, renew time.Time) store.Subscriber {
		s, _, err := cust.CreateSubscriber(ctx, tn.ID, customers.SubscriberInput{FullName: name, Phone: phone, PlanID: &plan.ID, StartNow: true})
		if err != nil {
			t.Fatal(err)
		}
		_ = d.WithTenant(ctx, tn.ID, func(q *store.Queries) error {
			s, err = q.ApplySubscriberPayment(ctx, store.ApplySubscriberPaymentParams{ID: s.ID, NextRenewalAt: &renew, CreditCents: 0, Status: "active"})
			return err
		})
		return s
	}
	soon := mk("Amina Njeri", "0712000301", time.Now().Add(48*time.Hour))
	tomorrow := mk("Brian", "0712000302", time.Now().Add(20*time.Hour))
	gone := mk("Carol", "0712000303", time.Now().Add(-time.Hour))
	_ = mk("Dan", "0712000304", time.Now().Add(20*24*time.Hour))

	// No credits yet: nothing sent, stage untouched.
	if err := w.Renewals(ctx); err != nil {
		t.Fatal(err)
	}
	if len(box.msgs) != 0 {
		t.Fatalf("sent without credits: %v", box.msgs)
	}
	if len(dc.users) != 1 || dc.users[0] != gone.PppoeUsername {
		t.Fatalf("disconnects = %v", dc.users)
	}
	_ = d.WithTenant(ctx, tn.ID, func(q *store.Queries) error {
		g, _ := q.GetSubscriber(ctx, gone.ID)
		if g.Status != "expired" {
			t.Fatalf("status = %s", g.Status)
		}
		_, err := q.AddSMSCredits(ctx, 10)
		return err
	})

	if err := w.Renewals(ctx); err != nil {
		t.Fatal(err)
	}
	if len(box.msgs) != 2 {
		t.Fatalf("want 2 reminders, got %v", box.msgs)
	}
	joined := strings.Join(box.msgs, "\n")
	if !strings.Contains(joined, "254712000301|Amina, your "+plan.Name+" Worker WiFi internet renews") ||
		!strings.Contains(joined, "Paybill 123456, Account "+soon.PppoeUsername) || !strings.Contains(joined, tomorrow.PppoeUsername) {
		t.Fatalf("reminders = %s", joined)
	}
	// Same stage never repeats.
	if err := w.Renewals(ctx); err != nil || len(box.msgs) != 2 {
		t.Fatalf("repeat reminders: %v %v", box.msgs, err)
	}
	if len(dc.users) != 1 {
		t.Fatalf("expired account disconnected twice: %v", dc.users)
	}
}

func TestHotspotExpirySMSAndHousekeeping(t *testing.T) {
	d := testutil.DB(t)
	sealer := testutil.Sealer(t)
	ctx := context.Background()
	tn := fixtures.Tenant(t, d, sealer, "Expiry WiFi")
	box := &outbox{}
	w := &worker.Worker{DB: d, SMS: &sms.Service{DB: d, Provider: box}, PortalURL: func(store.Tenant) string { return "https://p.example.com/?t=x" }}
	plan := fixtures.Plan(t, d, tn.ID, "hotspot", "")
	phone := "254712000400"
	receipt := "RKT" + strings.ToUpper(uuid.NewString()[:7])
	_ = d.WithTenant(ctx, tn.ID, func(q *store.Queries) error {
		start, end := time.Now().Add(-2*time.Hour), time.Now().Add(-time.Minute)
		p, err := q.CreatePurchase(ctx, store.CreatePurchaseParams{PlanID: plan.ID, Source: "mpesa", PhoneNumber: &phone, Macs: []string{"AA:BB:CC:DD:EE:02"}, MaxDevices: 1})
		if err != nil {
			return err
		}
		_, err = q.ActivatePurchase(ctx, store.ActivatePurchaseParams{ID: p.ID, StartsAt: &start, ExpiresAt: &end, MpesaReceiptNumber: &receipt})
		if err != nil {
			return err
		}
		_, err = q.AddSMSCredits(ctx, 5)
		return err
	})

	// Off by default: nothing is sent on the WISP's behalf.
	if err := w.HotspotExpirySMS(ctx); err != nil || len(box.msgs) != 0 {
		t.Fatalf("sent while disabled: %v %v", box.msgs, err)
	}
	conn, err := pgx.Connect(ctx, testutil.OwnerURL(t))
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close(ctx)
	if _, err := conn.Exec(ctx, `UPDATE tenants SET hotspot_expiry_sms_enabled = true, trial_ends_at = NOW() - INTERVAL '1 hour' WHERE id = $1`, tn.ID); err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 2; i++ {
		if err := w.HotspotExpirySMS(ctx); err != nil {
			t.Fatal(err)
		}
	}
	if len(box.msgs) != 1 || !strings.Contains(box.msgs[0], "Your Expiry WiFi hotspot package ("+plan.Name+") has expired. Buy another package to reconnect: https://p.example.com/?t=x") {
		t.Fatalf("expiry sms = %v", box.msgs)
	}

	if err := w.Housekeeping(ctx); err != nil {
		t.Fatal(err)
	}
	var status string
	_ = conn.QueryRow(ctx, `SELECT subscription_status FROM tenants WHERE id = $1`, tn.ID).Scan(&status)
	if status != "lapsed" {
		t.Fatalf("subscription = %s, want lapsed", status)
	}
}

func TestReminderTextTill(t *testing.T) {
	sc, sup := "5544332", "254712345678"
	tn := store.Tenant{Name: "Jazmoge WiFi", MpesaShortcodeType: "till", MpesaShortcode: &sc, SupportPhone: &sup}
	price := int32(150000)
	got := worker.ReminderText(tn, "Jane Wanjiru", "JZM1042", "Bronze 5 Mbps", &price, 50000, time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC))
	want := "Jane, your Bronze 5 Mbps Jazmoge WiFi internet renews Thu 1 Oct. To pay KSh 1000 call 0712 345 678."
	if got != want {
		t.Fatalf("got  %q\nwant %q", got, want)
	}
}
