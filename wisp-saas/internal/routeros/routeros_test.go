package routeros_test

import (
	"context"
	"net/http/httptest"
	"testing"

	"github.com/nabukob/lingarnew/wisp-saas/internal/routeros"
	mikrotikmock "github.com/nabukob/lingarnew/wisp-saas/mocks/mikrotik-mock"
)

func client(t *testing.T) (*routeros.Client, *mikrotikmock.Router) {
	mock := mikrotikmock.New("wisp-api", "pw")
	srv := httptest.NewServer(mock)
	t.Cleanup(srv.Close)
	return routeros.NewClient(srv.URL, "wisp-api", "pw", true), mock
}

func TestCount(t *testing.T) {
	c, mock := client(t)
	mock.Seed("ppp/active", mikrotikmock.Record{"name": "JZM1000"}, mikrotikmock.Record{"name": "JZM1001"})
	n, err := c.Count(context.Background(), "ppp/active")
	if err != nil || n != 2 {
		t.Fatalf("Count = %d, %v", n, err)
	}
	if n, err := c.Count(context.Background(), "ip/hotspot/active"); err != nil || n != 0 {
		t.Fatalf("empty Count = %d, %v", n, err)
	}
}

func TestUplink(t *testing.T) {
	c, mock := client(t)
	ctx := context.Background()
	if _, ok, err := c.Uplink(ctx); ok || err != nil {
		t.Fatalf("no default route: ok=%v err=%v", ok, err)
	}
	mock.Seed("ip/route",
		mikrotikmock.Record{"dst-address": "0.0.0.0/0", "active": "false", "immediate-gw": "10.9.9.1%ether9"},
		mikrotikmock.Record{"dst-address": "0.0.0.0/0", "active": "true", "gateway": "192.168.1.1", "immediate-gw": "192.168.1.1%ether1"})
	mock.Seed("interface",
		mikrotikmock.Record{"name": "ether1", "rx-byte": "1000", "tx-byte": "250"},
		mikrotikmock.Record{"name": "wg-saas", "rx-byte": "9", "tx-byte": "9"})
	u, ok, err := c.Uplink(ctx)
	if err != nil || !ok || u.Interface != "ether1" || u.RxBytes != 1000 || u.TxBytes != 250 {
		t.Fatalf("Uplink = %+v ok=%v err=%v", u, ok, err)
	}

	// PPPoE client uplink: the gateway is the interface itself.
	mock.Seed("ip/route", mikrotikmock.Record{"dst-address": "0.0.0.0/0", "active": "true", "gateway": "pppoe-out1"})
	mock.Seed("interface", mikrotikmock.Record{"name": "pppoe-out1", "rx-byte": "5", "tx-byte": "6"})
	if u, ok, _ := c.Uplink(ctx); !ok || u.Interface != "pppoe-out1" {
		t.Fatalf("pppoe uplink = %+v ok=%v", u, ok)
	}
}

func TestNeighbors(t *testing.T) {
	c, mock := client(t)
	mock.Seed("ip/neighbor",
		mikrotikmock.Record{"interface": "ether2,bridge", "mac-address": "aa:bb:cc:00:00:01", "identity": "Tower Beta",
			"address4": "192.168.50.2", "address": "fe80::1", "platform": "MikroTik", "board": "RB5009", "version": "7.15"},
		mikrotikmock.Record{"interface": "ether3", "mac-address": "aa:bb:cc:00:00:02", "address": "192.168.50.3", "platform": "Ubiquiti"},
		mikrotikmock.Record{"interface": "", "mac-address": "aa:bb:cc:00:00:03"})
	ns, err := c.Neighbors(context.Background())
	if err != nil || len(ns) != 2 {
		t.Fatalf("Neighbors = %+v, %v", ns, err)
	}
	if n := ns[0]; n.Interface != "ether2" || n.MAC != "AA:BB:CC:00:00:01" || n.Address != "192.168.50.2" || n.Identity != "Tower Beta" || n.Board != "RB5009" {
		t.Fatalf("first neighbor = %+v", n)
	}
	if ns[1].Address != "192.168.50.3" || ns[1].Platform != "Ubiquiti" {
		t.Fatalf("second neighbor = %+v", ns[1])
	}
}

func TestUptimeSeconds(t *testing.T) {
	for in, want := range map[string]int64{"1d2h3m": 93780, "2w": 1209600, "45s": 45, "": 0, "1d02:03": 0} {
		if got := routeros.UptimeSeconds(in); got != want {
			t.Errorf("UptimeSeconds(%q) = %d, want %d", in, got, want)
		}
	}
}
