package tunnel

import (
	"net/netip"
	"strings"
	"testing"
)

type fakeDev struct{ state, lastSet string }

func (f *fakeDev) IpcGet() (string, error) { return f.state, nil }
func (f *fakeDev) IpcSet(s string) error   { f.lastSet = s; return nil }

const (
	k1 = "cm91dGVyLXB1YmxpYy1rZXktMzItYnl0ZXMtbG9uZyE="
	k2 = "c2VydmVyLXB1YmxpYy1rZXktMzItYnl0ZXMtbG9uZyE="
)

func TestDiffAndApply(t *testing.T) {
	a := netip.MustParseAddr("10.200.0.2")
	b := netip.MustParseAddr("10.200.0.3")
	up, rm := Diff(Peers{k1: a, k2: a}, Peers{k1: a, k2: b})
	if len(up) != 1 || up[k2] != b || len(rm) != 0 {
		t.Fatalf("diff = %v %v", up, rm)
	}
	up, rm = Diff(Peers{k1: a}, Peers{})
	if len(up) != 0 || len(rm) != 1 {
		t.Fatalf("diff remove = %v %v", up, rm)
	}

	h1, _ := KeyToHex(k1)
	h2, _ := KeyToHex(k2)
	dev := &fakeDev{state: "private_key=00\nlisten_port=51820\npublic_key=" + h1 + "\nallowed_ip=10.200.0.2/32\nlast_handshake_time_sec=1700000000\npublic_key=" + h2 + "\nallowed_ip=10.200.0.9/32\n"}
	cur, err := Current(dev)
	if err != nil || cur[k1] != a || cur[k2] != netip.MustParseAddr("10.200.0.9") {
		t.Fatalf("current = %v %v", cur, err)
	}
	up, rm = Diff(cur, Peers{k1: a})
	if err := Apply(dev, up, rm); err != nil {
		t.Fatal(err)
	}
	if dev.lastSet != "public_key="+h2+"\nremove=true\n" {
		t.Fatalf("set = %q", dev.lastSet)
	}
	if err := Apply(dev, Peers{k2: b}, nil); err != nil || !strings.Contains(dev.lastSet, "replace_allowed_ips=true\nallowed_ip=10.200.0.3/32") {
		t.Fatalf("set = %q", dev.lastSet)
	}
	hs, _ := Handshakes(dev)
	if hs[k1].Unix() != 1700000000 {
		t.Fatalf("handshakes = %v", hs)
	}
	if _, err := KeyToHex("bad"); err == nil {
		t.Fatal("bad key accepted")
	}
}
