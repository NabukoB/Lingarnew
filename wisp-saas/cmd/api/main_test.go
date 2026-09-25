package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"strings"
	"testing"

	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/config"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil"
)

// TestAPISmoke drives the assembled HTTP API the way the dashboard and the
// captive portal do.
func TestAPISmoke(t *testing.T) {
	cfg := config.Config{
		PublicAPIURL: "https://api.example.com", PortalBaseURL: "https://portal.example.com",
		WGTunnelCIDR: netip.MustParsePrefix("10.200.0.0/16"), WGServerPublicKey: "c2VydmVyLXB1YmxpYy1rZXktMzItYnl0ZXMtbG9uZyE=",
		WGServerEndpoint: "vpn.example.com:51820", RadiusSecretSeed: "seed", MpesaShortcode: "174379",
		AllowedOrigins: []string{"http://localhost:3010"}, SessionTTL: 3600e9,
	}
	app := assemble(cfg, testutil.DB(t), testutil.Sealer(t))
	srv := httptest.NewServer(Handler(app))
	defer srv.Close()

	token := ""
	call := func(method, path string, body any, want int) map[string]any {
		t.Helper()
		var rd io.Reader
		if body != nil {
			b, _ := json.Marshal(body)
			rd = bytes.NewReader(b)
		}
		req, _ := http.NewRequest(method, srv.URL+path, rd)
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		raw, _ := io.ReadAll(resp.Body)
		if resp.StatusCode != want {
			t.Fatalf("%s %s = %d, want %d: %s", method, path, resp.StatusCode, want, raw)
		}
		out := map[string]any{}
		_ = json.Unmarshal(raw, &out)
		return out
	}

	call("GET", "/healthz", nil, 200)
	if e := call("GET", "/v1/me", nil, 401); e["error"] == nil {
		t.Fatal("401 must carry an error body")
	}
	out := call("POST", "/v1/auth/signup", map[string]any{"email": "owner@smoke.example", "password": "longenough1", "business_name": "Smoke WiFi",
		"support_phone": "0712345678", "shortcode_type": "paybill", "shortcode": "174379"}, 201)
	token = out["token"].(string)
	slug := out["tenant"].(map[string]any)["slug"].(string)

	call("GET", "/v1/me", nil, 200)
	plans := call("GET", "/v1/plans", nil, 200)
	if len(plans["plans"].([]any)) < 7 {
		t.Fatalf("seeded plans = %v", plans)
	}
	var pppoePlan string
	for _, p := range plans["plans"].([]any) {
		if pm := p.(map[string]any); pm["access_type"] == "pppoe" {
			pppoePlan = pm["id"].(string)
			break
		}
	}
	sub := call("POST", "/v1/subscribers", map[string]any{"full_name": "Jane Doe", "phone": "0712000999", "plan_id": pppoePlan, "start_now": true}, 201)
	if !strings.HasPrefix(sub["subscriber"].(map[string]any)["account_id"].(string), "SMK") {
		t.Fatalf("subscriber = %v", sub)
	}
	call("GET", "/v1/subscribers", nil, 200)
	locs := call("GET", "/v1/locations", nil, 200)
	loc := locs["locations"].([]any)[0].(map[string]any)["id"].(string)
	rt := call("POST", "/v1/routers", map[string]any{"location_id": loc, "name": "Smoke Mast", "hotspot_ports": []string{"ether3"}}, 201)
	cmd := rt["setup"].(map[string]any)["command"].(string)
	onboard := cmd[strings.Index(cmd, "/onboard/"):strings.Index(cmd, `" dst-path`)]

	req, _ := http.NewRequest("GET", srv.URL+onboard, nil)
	resp, _ := http.DefaultClient.Do(req)
	script, _ := io.ReadAll(resp.Body)
	if !strings.Contains(string(script), "Setup complete.") {
		t.Fatalf("script = %.200s", script)
	}
	call("GET", "/v1/routers", nil, 200)
	call("GET", "/v1/dashboard/overview", nil, 200)
	call("GET", "/v1/dashboard/revenue?period=month", nil, 200)
	call("GET", "/v1/payments", nil, 200)

	token = ""
	info := call("GET", "/v1/portal/"+slug+"/", nil, 200)
	if info["name"] != "Smoke WiFi" || len(info["packages"].([]any)) == 0 {
		t.Fatalf("portal = %v", info)
	}
	call("GET", "/v1/portal/nope-nope/", nil, 404)
	call("GET", "/v1/nothing", nil, 404)
	call("POST", "/v1/auth/login", map[string]any{"email": "owner@smoke.example", "password": "wrong-password"}, 401)
}
