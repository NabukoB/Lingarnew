// Command script-generator prints a sample onboarding script, for reviewing
// the RouterOS output or testing it on a lab router / CHR. Production scripts
// are rendered by internal/router for each one-time setup token.
//
//	go run ./tools/script-generator -hotspot ether3,wlan1 -pppoe ether2 > setup.rsc
package main

import (
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/nabukob/lingarnew/wisp-saas/internal/router"
)

func split(s string) []string {
	var out []string
	for _, p := range strings.Split(s, ",") {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

func main() {
	name := flag.String("name", "Lab Router", "router name")
	hs := flag.String("hotspot", "ether3", "comma-separated hotspot ports")
	pp := flag.String("pppoe", "ether2", "comma-separated PPPoE ports")
	tunnelIP := flag.String("tunnel-ip", "10.200.0.2", "router tunnel address")
	api := flag.String("api", "https://api.example.com", "public API URL")
	portal := flag.String("portal", "portal.example.com", "portal host")
	endpoint := flag.String("endpoint", "vpn.example.com:51820", "WireGuard server host:port")
	key := flag.String("server-key", "c2VydmVyLXB1YmxpYy1rZXktMzItYnl0ZXMtbG9uZyE=", "WireGuard server public key")
	flag.Parse()

	host, port, _ := strings.Cut(*endpoint, ":")
	now := time.Now().UTC()
	out, err := router.RenderScript(router.ScriptData{
		RouterID: "00000000-0000-0000-0000-000000000000", RouterName: *name, TenantName: "Sample WISP",
		Generated: now, Expires: now.Add(router.TokenTTL), TunnelIP: *tunnelIP, ServerIP: "10.200.0.1",
		ServerKey: *key, EndpointHost: host, EndpointPort: port, APIUser: "wisp-api", APIPassword: "sample-password",
		RadiusSecret: "sample-secret", HotspotPorts: split(*hs), PPPoEPorts: split(*pp),
		WalledGarden: []string{*portal}, CheckHost: strings.TrimPrefix(strings.TrimPrefix(*api, "https://"), "http://"),
		FilesURL: *api + "/onboard/TOKEN/hotspot", CallbackURL: *api + "/onboard/TOKEN",
	})
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Print(out)
}
