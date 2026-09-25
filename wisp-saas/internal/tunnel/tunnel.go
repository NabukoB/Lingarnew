// Package tunnel ("tunnel-orchestrator") keeps the cloud WireGuard interface's
// peers in line with the routers table. The database is the source of truth:
// the gateway re-reads it every few seconds and applies only the difference,
// so live peers keep their handshakes.
package tunnel

import (
	"bufio"
	"context"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/netip"
	"sort"
	"strings"
	"time"

	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/db"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
)

// Peers maps a router's WireGuard public key (base64) to its tunnel IP.
type Peers map[string]netip.Addr

// Device is the part of a WireGuard device the reconciler needs
// (wireguard-go's *device.Device satisfies it).
type Device interface {
	IpcGet() (string, error)
	IpcSet(string) error
}

// Diff returns the peers to add or update and the keys to remove.
func Diff(current, desired Peers) (upsert Peers, remove []string) {
	upsert = Peers{}
	for k, ip := range desired {
		if cur, ok := current[k]; !ok || cur != ip {
			upsert[k] = ip
		}
	}
	for k := range current {
		if _, ok := desired[k]; !ok {
			remove = append(remove, k)
		}
	}
	sort.Strings(remove)
	return upsert, remove
}

// KeyToHex converts a base64 WireGuard key to the hex form UAPI uses.
func KeyToHex(b64 string) (string, error) {
	b, err := base64.StdEncoding.DecodeString(b64)
	if err != nil || len(b) != 32 {
		return "", fmt.Errorf("invalid WireGuard key")
	}
	return hex.EncodeToString(b), nil
}

func hexToKey(h string) string {
	b, err := hex.DecodeString(h)
	if err != nil {
		return ""
	}
	return base64.StdEncoding.EncodeToString(b)
}

// Current reads the device's peers (only /32 allowed IPs are ours).
func Current(dev Device) (Peers, error) {
	out, err := dev.IpcGet()
	if err != nil {
		return nil, err
	}
	peers := Peers{}
	key := ""
	sc := bufio.NewScanner(strings.NewReader(out))
	for sc.Scan() {
		k, v, ok := strings.Cut(sc.Text(), "=")
		if !ok {
			continue
		}
		switch k {
		case "public_key":
			key = hexToKey(v)
			peers[key] = netip.Addr{}
		case "allowed_ip":
			if p, err := netip.ParsePrefix(v); err == nil && key != "" && p.Bits() == 32 {
				peers[key] = p.Addr()
			}
		}
	}
	return peers, sc.Err()
}

// Apply writes a diff to the device.
func Apply(dev Device, upsert Peers, remove []string) error {
	if len(upsert) == 0 && len(remove) == 0 {
		return nil
	}
	var b strings.Builder
	for _, k := range remove {
		h, err := KeyToHex(k)
		if err != nil {
			continue
		}
		fmt.Fprintf(&b, "public_key=%s\nremove=true\n", h)
	}
	keys := make([]string, 0, len(upsert))
	for k := range upsert {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		h, err := KeyToHex(k)
		if err != nil {
			continue
		}
		fmt.Fprintf(&b, "public_key=%s\nreplace_allowed_ips=true\nallowed_ip=%s/32\n", h, upsert[k])
	}
	return dev.IpcSet(b.String())
}

// Desired loads peers from the database.
func Desired(ctx context.Context, d *db.DB) (Peers, error) {
	out := Peers{}
	err := d.WithoutTenant(ctx, func(q *store.Queries) error {
		rows, err := q.WireguardPeers(ctx)
		for _, r := range rows {
			out[r.PublicKey] = r.TunnelIp
		}
		return err
	})
	return out, err
}

// Reconcile brings the device in line with the database once.
func Reconcile(ctx context.Context, d *db.DB, dev Device) (added, removed int, err error) {
	want, err := Desired(ctx, d)
	if err != nil {
		return 0, 0, err
	}
	have, err := Current(dev)
	if err != nil {
		return 0, 0, err
	}
	up, rm := Diff(have, want)
	return len(up), len(rm), Apply(dev, up, rm)
}

// Handshakes returns each peer's last handshake time.
func Handshakes(dev Device) (map[string]time.Time, error) {
	out, err := dev.IpcGet()
	if err != nil {
		return nil, err
	}
	res := map[string]time.Time{}
	key := ""
	var sec int64
	sc := bufio.NewScanner(strings.NewReader(out))
	for sc.Scan() {
		k, v, _ := strings.Cut(sc.Text(), "=")
		switch k {
		case "public_key":
			key = hexToKey(v)
		case "last_handshake_time_sec":
			fmt.Sscan(v, &sec)
			if sec > 0 {
				res[key] = time.Unix(sec, 0)
			}
		}
	}
	return res, sc.Err()
}
