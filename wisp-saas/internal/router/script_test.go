package router

import (
	"bytes"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

func sample() ScriptData {
	return ScriptData{
		RouterID: "r1", RouterName: `Ruiru "Mast"`, TenantName: "Jazmoge WiFi",
		Generated: time.Date(2026, 9, 25, 10, 0, 0, 0, time.UTC), Expires: time.Date(2026, 9, 26, 10, 0, 0, 0, time.UTC),
		TunnelIP: "10.200.0.7", ServerIP: "10.200.0.1", ServerKey: "c2VydmVyLXB1YmxpYy1rZXktMzItYnl0ZXMtbG9uZyE=",
		EndpointHost: "vpn.example.com", EndpointPort: "51820", APIUser: "wisp-api", APIPassword: "pw$1",
		RadiusSecret: "abc123", HotspotPorts: []string{"ether3", "wlan1"}, PPPoEPorts: []string{"ether2"},
		WalledGarden: []string{"portal.example.com"}, CheckHost: "api.example.com",
		FilesURL: "https://api.example.com/onboard/tok/hotspot", CallbackURL: "https://api.example.com/onboard/tok",
	}
}

func TestRenderScript(t *testing.T) {
	out, err := RenderScript(sample())
	if err != nil {
		t.Fatal(err)
	}
	must := []string{
		`:foreach p in={"ether3";"wlan1";"ether2"} do={`,
		`RouterOS v7.1+`,
		`/ping 8.8.8.8 count=4`,
		`/system identity set name="Ruiru \"Mast\""`,
		`password="pw\$1"`,
		`public-key="c2VydmVyLXB1YmxpYy1rZXktMzItYnl0ZXMtbG9uZyE=" endpoint-address="vpn.example.com" endpoint-port=51820 allowed-address=10.200.0.1/32 persistent-keepalive=25s`,
		`/ip address add address=10.200.0.7/32 network=10.200.0.1 interface=wg-saas`,
		`/radius add service=ppp,hotspot address=10.200.0.1 secret="abc123" src-address=10.200.0.7`,
		`/radius incoming set accept=yes`,
		`/ip service set www-ssl certificate=wisp-api address=10.200.0.1/32 disabled=no`,
		`service-name=WISP-PPPoE interface=bridge-pppoe`,
		`/ip hotspot walled-garden add dst-host="portal.example.com"`,
		`force DNS to router`,
		`/tool fetch url="https://api.example.com/onboard/tok" http-method=post`,
		`Setup complete. Router will dial home in ~10 seconds.`,
	}
	for _, m := range must {
		if !strings.Contains(out, m) {
			t.Errorf("script missing %q", m)
		}
	}
	// The whole body is one block so :local variables survive /import.
	body := strings.TrimSpace(out[strings.Index(out, "\n{"):])
	if !strings.HasPrefix(body, "{") || !strings.HasSuffix(body, "}") {
		t.Error("script body must be wrapped in { }")
	}
	if strings.Count(out, "{")-strings.Count(out, `\{`) != strings.Count(out, "}") {
		t.Error("unbalanced braces")
	}
}

func TestRenderScriptHotspotOnly(t *testing.T) {
	d := sample()
	d.PPPoEPorts = nil
	out, _ := RenderScript(d)
	if strings.Contains(out, "pppoe-server server add") {
		t.Error("PPPoE section rendered without PPPoE ports")
	}
	if !strings.Contains(out, "/ip hotspot add name=wisp-hotspot") {
		t.Error("hotspot missing")
	}
}

func TestErrorScript(t *testing.T) {
	if got := ErrorScript(`expired "x"`); got != ":error \"WISP setup stopped: expired \\\"x\\\"\"\n" {
		t.Fatalf("got %q", got)
	}
}

func TestHotspotFiles(t *testing.T) {
	for _, f := range HotspotFiles {
		var b bytes.Buffer
		if err := RenderHotspotFile(&b, f, PortalData{TenantName: "A<b>", PortalURL: "https://p.example.com/?t=a", RouterID: "r1"}); err != nil {
			t.Fatalf("%s: %v", f, err)
		}
		if strings.Contains(b.String(), "A<b>") {
			t.Errorf("%s: tenant name not escaped", f)
		}
	}
	var b bytes.Buffer
	_ = RenderHotspotFile(&b, "login.html", PortalData{TenantName: "A", PortalURL: "https://p.example.com/?t=a", RouterID: "r1"})
	if !strings.Contains(b.String(), `encodeURIComponent("$(link-login-only)")`) {
		t.Error("login.html must pass link-login-only to the portal")
	}
	if err := RenderHotspotFile(&b, "../x", PortalData{}); err == nil {
		t.Error("unknown file must fail")
	}
}

func TestRadiusSecret(t *testing.T) {
	a, b := uuid.New(), uuid.New()
	if RadiusSecret("seed", a) != RadiusSecret("seed", a) {
		t.Fatal("not deterministic")
	}
	if RadiusSecret("seed", a) == RadiusSecret("seed", b) || RadiusSecret("seed", a) == RadiusSecret("other", a) {
		t.Fatal("secrets must differ per router and seed")
	}
	if len(RadiusSecret("seed", a)) != 32 {
		t.Fatal("want 32 hex chars")
	}
}

func TestValidators(t *testing.T) {
	for _, p := range []string{"ether2", "wlan1", "sfp-sfpplus1", "bridge.10"} {
		if !ValidPort(p) {
			t.Errorf("%s should be valid", p)
		}
	}
	for _, p := range []string{"", "ether 2", `a"b`, "$x", strings.Repeat("a", 40)} {
		if ValidPort(p) {
			t.Errorf("%q should be invalid", p)
		}
	}
	if !ValidWireGuardKey("c2VydmVyLXB1YmxpYy1rZXktMzItYnl0ZXMtbG9uZyE=") || ValidWireGuardKey("short") {
		t.Error("key validation wrong")
	}
	if err := validatePorts([]string{"ether2"}, []string{"ether2"}); err == nil {
		t.Error("port twice must fail")
	}
	if err := validatePorts(nil, nil); err == nil {
		t.Error("no ports must fail")
	}
}
