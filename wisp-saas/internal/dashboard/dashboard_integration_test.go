package dashboard_test

import (
	"context"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/nabukob/lingarnew/wisp-saas/internal/dashboard"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil/fixtures"
)

func TestOverviewAndRevenue(t *testing.T) {
	d := testutil.DB(t)
	ctx := context.Background()
	tn := fixtures.Tenant(t, d, testutil.Sealer(t), "Dash WiFi")
	other := fixtures.Tenant(t, d, testutil.Sealer(t), "Other WiFi")
	conn, err := pgx.Connect(ctx, testutil.OwnerURL(t))
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close(ctx)
	// Two successful payments for tn now, one yesterday, and one for another tenant.
	for _, row := range []struct {
		tenant any
		cents  int
		ago    string
	}{{tn.ID, 150000, "1 minute"}, {tn.ID, 6000, "2 minutes"}, {tn.ID, 200000, "1 day 5 minutes"}, {other.ID, 999900, "1 minute"}} {
		_, err := conn.Exec(ctx, `INSERT INTO mpesa_transactions (tenant_id, source, amount_cents, account_reference, status, callback_received_at)
			VALUES ($1, 'c2b', $2, 'X', 'success', NOW() - $3::interval)`, row.tenant, row.cents, row.ago)
		if err != nil {
			t.Fatal(err)
		}
	}
	svc := &dashboard.Service{DB: d}
	o, err := svc.Overview(ctx, tn.ID)
	if err != nil {
		t.Fatal(err)
	}
	// Payments a minute ago may fall before midnight in the tenant's zone only in the first minutes of a day.
	if h := time.Now().In(time.FixedZone("EAT", 3*3600)).Hour(); h > 0 && (o.MpesaToday != 1560 || o.MpesaTodayPrev != 2000) {
		t.Fatalf("overview = %+v", o)
	}
	if len(o.Sparkline) == 0 || o.Sparkline[len(o.Sparkline)-1] != o.MpesaToday {
		t.Fatalf("sparkline = %v", o.Sparkline)
	}
	r, err := svc.Revenue(ctx, tn.ID, "week")
	if err != nil {
		t.Fatal(err)
	}
	if len(r.Series.Previous) != 7 || len(r.Series.Current) != 7 || r.Total != 3560 || r.Split[0].Label != "PPPoE" {
		t.Fatalf("revenue = %+v", r)
	}
}

func TestWindow(t *testing.T) {
	now := time.Date(2026, 9, 25, 14, 30, 0, 0, time.UTC)
	since, step, n, elapsed, prev, labels := dashboard.Window("day", now)
	if !since.Equal(time.Date(2026, 9, 25, 0, 0, 0, 0, time.UTC)) || step != time.Hour || n != 24 || elapsed != 15 || !prev.Equal(since.Add(-24*time.Hour)) || labels[2] != "Now" {
		t.Fatalf("day window: %v %v %d %d %v %v", since, step, n, elapsed, prev, labels)
	}
	_, _, n, elapsed, _, labels = dashboard.Window("month", now)
	if n != 30 || elapsed != 30 || labels[0] != "27 Aug" {
		t.Fatalf("month window: %d %d %v", n, elapsed, labels)
	}
}
