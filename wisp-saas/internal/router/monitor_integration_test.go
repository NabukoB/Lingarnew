package router_test

import (
	"context"
	"strconv"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/nabukob/lingarnew/wisp-saas/internal/router"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
	mikrotikmock "github.com/nabukob/lingarnew/wisp-saas/mocks/mikrotik-mock"
)

// onboard creates a router and completes its setup callback.
func onboard(t *testing.T, svc *router.Service, tenantID, loc uuid.UUID, name, pub string) store.Router {
	t.Helper()
	ctx := context.Background()
	rt, setup, err := svc.Create(ctx, tenantID, router.CreateInput{LocationID: loc, Name: name, HotspotPorts: []string{"ether3"}})
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.Complete(ctx, tokenOf(t, setup.Command), router.CallbackInput{PublicKey: pub}); err != nil {
		t.Fatal(err)
	}
	// The test database is shared and PollAll visits every tenant's routers.
	t.Cleanup(func() {
		_ = svc.DB.WithTenant(context.Background(), tenantID, func(q *store.Queries) error { return q.DeleteRouter(context.Background(), rt.ID) })
	})
	return rt
}

func TestMonitoringSamplesNeighborsAndAlerts(t *testing.T) {
	svc, mock, al, tn, loc := setup(t)
	ctx := context.Background()
	clock := time.Now().UTC().Truncate(time.Minute)
	svc.Now = func() time.Time { return clock }

	rt := onboard(t, svc, tn.ID, loc, "Tower Alpha", "cm91dGVyLWFscGhhLWtleS0zMi1ieXRlcy1sb25nISE=")
	beta := onboard(t, svc, tn.ID, loc, "Tower Beta", "cm91dGVyLWJldGEta2V5LTMyLWJ5dGVzLWxvbmchISE=")

	mock.Seed("ip/route", mikrotikmock.Record{"dst-address": "0.0.0.0/0", "active": "true", "immediate-gw": "192.168.1.1%ether1"})
	setCounters := func(rx, tx int64) {
		mock.Seed("interface", mikrotikmock.Record{"name": "ether1", "rx-byte": strconv.FormatInt(rx, 10), "tx-byte": strconv.FormatInt(tx, 10)})
	}
	setCounters(1_000_000, 500_000)
	mock.Seed("ppp/active", mikrotikmock.Record{"name": "JZM1000"}, mikrotikmock.Record{"name": "JZM1001"})
	mock.Seed("ip/hotspot/active", mikrotikmock.Record{"user": "AA:BB:CC:DD:EE:01"})
	mock.Seed("ip/neighbor",
		mikrotikmock.Record{"interface": "ether2", "mac-address": "AA:00:00:00:00:02", "identity": "tower beta", "address4": "192.168.50.2", "platform": "MikroTik"},
		mikrotikmock.Record{"interface": "ether4", "mac-address": "AA:00:00:00:00:09", "identity": "LiteBeam-Kasarani", "platform": "Ubiquiti"})

	if err := svc.Poll(ctx, tn.ID, rt.ID); err != nil {
		t.Fatal(err)
	}
	clock = clock.Add(time.Minute)
	setCounters(1_000_000+7_500_000, 500_000+750_000) // 1 Mbit/s down, 100 kbit/s up over 60s
	if err := svc.Poll(ctx, tn.ID, rt.ID); err != nil {
		t.Fatal(err)
	}

	series, err := svc.Metrics(ctx, tn.ID, rt.ID, "24h")
	if err != nil || len(series.Points) == 0 {
		t.Fatalf("metrics = %+v, %v", series, err)
	}
	last := series.Points[len(series.Points)-1]
	if last.PPPoEUsers != 2 || last.HotspotUsers != 1 || last.CPULoad != 12 || last.MemUsedPct != 88 {
		t.Fatalf("last point = %+v", last)
	}
	var live map[uuid.UUID]router.Live
	_ = svc.DB.WithTenant(ctx, tn.ID, func(q *store.Queries) error {
		live, err = svc.LiveMetrics(ctx, q)
		return err
	})
	if l := live[rt.ID]; l.RxBps == nil || *l.RxBps != 1_000_000 || l.TxBps == nil || *l.TxBps != 100_000 {
		t.Fatalf("live = %+v", l)
	}
	if _, err := svc.Metrics(ctx, tn.ID, rt.ID, "1y"); err == nil {
		t.Fatal("bad range accepted")
	}

	sites, err := svc.Map(ctx, tn.ID)
	if err != nil {
		t.Fatal(err)
	}
	var alpha *router.MapRouter
	for i := range sites {
		for j := range sites[i].Routers {
			if sites[i].Routers[j].ID == rt.ID {
				alpha = &sites[i].Routers[j]
			}
		}
	}
	if alpha == nil || len(alpha.Neighbors) != 2 || alpha.Live == nil {
		t.Fatalf("map node = %+v", alpha)
	}
	for _, n := range alpha.Neighbors {
		switch n.Identity {
		case "tower beta":
			if n.RouterID == nil || *n.RouterID != beta.ID {
				t.Fatalf("neighbor should link to Tower Beta: %+v", n)
			}
		case "LiteBeam-Kasarani":
			if n.RouterID != nil {
				t.Fatalf("foreign device linked: %+v", n)
			}
		}
	}

	// Neighbours are re-read only every 10 minutes.
	mock.Seed("ip/neighbor")
	clock = clock.Add(time.Minute)
	_ = svc.Poll(ctx, tn.ID, rt.ID)
	if sites, _ := svc.Map(ctx, tn.ID); countNeighbors(sites, rt.ID) != 2 {
		t.Fatal("neighbours refreshed too early")
	}
	clock = clock.Add(router.NeighborEvery)
	_ = svc.Poll(ctx, tn.ID, rt.ID)
	if sites, _ := svc.Map(ctx, tn.ID); countNeighbors(sites, rt.ID) != 0 {
		t.Fatal("neighbours not refreshed after 10 minutes")
	}

	// 15 minutes at 95% raises one alert; staying high does not repeat it.
	res := mock.Singleton("system/resource")
	res["cpu-load"] = "95"
	mock.SetSingleton("system/resource", res)
	for i := 0; i < router.HighCPUSamples+5; i++ {
		clock = clock.Add(time.Minute)
		if err := svc.Poll(ctx, tn.ID, rt.ID); err != nil {
			t.Fatal(err)
		}
	}
	if len(al.cpu) != 1 || al.cpu[0] != "Tower Alpha" {
		t.Fatalf("cpu alerts = %v", al.cpu)
	}

	// Two days later, minute samples are folded into hourly rows.
	clock = clock.Add(72 * time.Hour)
	if err := svc.FoldMetrics(ctx, tn.ID); err != nil {
		t.Fatal(err)
	}
	var minute, hourly int
	tx, err := svc.DB.Pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	_, _ = tx.Exec(ctx, "SELECT set_config('app.current_tenant_id', $1, true)", tn.ID.String())
	if err := tx.QueryRow(ctx, "SELECT count(*) FILTER (WHERE resolution_sec = 60), count(*) FILTER (WHERE resolution_sec = 3600) FROM router_metrics").Scan(&minute, &hourly); err != nil {
		t.Fatal(err)
	}
	if minute != 0 || hourly == 0 {
		t.Fatalf("after fold: %d minute rows, %d hourly rows", minute, hourly)
	}
	if s, err := svc.Metrics(ctx, tn.ID, rt.ID, "7d"); err != nil || len(s.Points) == 0 {
		t.Fatalf("7d series after fold = %+v, %v", s, err)
	}
}

func countNeighbors(sites []router.MapSite, id uuid.UUID) int {
	for _, s := range sites {
		for _, r := range s.Routers {
			if r.ID == id {
				return len(r.Neighbors)
			}
		}
	}
	return -1
}
