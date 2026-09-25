package tunnel_test

import (
	"context"
	"net/netip"
	"testing"

	"github.com/google/uuid"

	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil/fixtures"
	"github.com/nabukob/lingarnew/wisp-saas/internal/tunnel"
)

type dev struct{ set []string }

func (d *dev) IpcGet() (string, error) { return "private_key=00\n", nil }
func (d *dev) IpcSet(s string) error   { d.set = append(d.set, s); return nil }

func TestReconcileFromDatabase(t *testing.T) {
	d := testutil.DB(t)
	tn := fixtures.Tenant(t, d, testutil.Sealer(t), "Tunnel WiFi")
	ctx := context.Background()
	key := "cm91dGVyLXB1YmxpYy1rZXktMzItYnl0ZXMtbG9uZyE="
	err := d.WithTenant(ctx, tn.ID, func(q *store.Queries) error {
		ls, _ := q.ListLocations(ctx)
		ip, err := q.AllocateTunnelIP(ctx, netip.MustParsePrefix("10.200.0.0/16"))
		if err != nil {
			return err
		}
		r, err := q.CreateRouter(ctx, store.CreateRouterParams{ID: uuid.New(), LocationID: ls[0].ID, Name: "R", TunnelIp: ip, ApiPasswordEnc: []byte{1}, HotspotPorts: []string{}, PppoePorts: []string{}})
		if err != nil {
			return err
		}
		return q.SetRouterPublicKey(ctx, store.SetRouterPublicKeyParams{ID: r.ID, WgPublicKey: &key})
	})
	if err != nil {
		t.Fatal(err)
	}
	want, err := tunnel.Desired(ctx, d)
	if err != nil || !want[key].IsValid() {
		t.Fatalf("desired = %v %v", want, err)
	}
	dv := &dev{}
	added, removed, err := tunnel.Reconcile(ctx, d, dv)
	if err != nil || added < 1 || removed != 0 || len(dv.set) != 1 {
		t.Fatalf("reconcile = %d %d %v %v", added, removed, err, dv.set)
	}
}
