//go:build perf

// Performance budgets for the assembled API and the RADIUS backend, measured
// against a database seeded like a large ISP (60 routers with a month of
// history, 8,000 PPPoE customers, 90 days of payments, 300 other ISPs).
//
//	go test -tags perf -run TestPerf -count=1 ./cmd/api/
//
// PERF_REPORT=dir writes api-perf.json and api-perf.md there.
// PERF_BUDGET_SCALE=2 doubles every latency budget and halves every throughput
// floor (slow CI runners); PERF_REQUESTS overrides the request count per endpoint.
//
// Dashboard and admin reads run with 4 concurrent clients (a few staff members).
// The captive portal and RADIUS run with 32: phones and routers arrive in bursts,
// e.g. every customer reconnecting after a power cut. RADIUS budgets sit well
// inside the routers' 2 s RADIUS timeout.
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/pquerna/otp/totp"

	"github.com/nabukob/lingarnew/wisp-saas/internal/admin"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/config"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil"
)

// Data volumes for the seeded ISP.
const (
	perfRouters     = 60
	perfSubscribers = 8000
	perfPayments    = 30000 // PPPoE payments; as many again for Hotspot
	perfSessions    = 50000 // closed sessions, plus 3,000 open
	perfOtherISPs   = 300
	radiusToken     = "perf-radius-token"
)

type budget struct {
	Name     string        `json:"name"`
	Method   string        `json:"method"`
	Path     string        `json:"path"`
	P95      time.Duration `json:"-"`
	MinRPS   float64       `json:"min_rps,omitempty"`
	Conc     int           `json:"concurrency"` // 0 = 4: a few staff members, not a crowd
	auth     string
	body     func(i int) []byte
	header   func(r *http.Request, i int)
	wantCode int
}

type result struct {
	Name     string  `json:"name"`
	Requests int     `json:"requests"`
	Errors   int     `json:"errors"`
	P50ms    float64 `json:"p50_ms"`
	P95ms    float64 `json:"p95_ms"`
	P99ms    float64 `json:"p99_ms"`
	RPS      float64 `json:"rps"`
	BudgetMs float64 `json:"budget_p95_ms"`
	MinRPS   float64 `json:"budget_min_rps,omitempty"`
	Conc     int     `json:"concurrency"`
	Pass     bool    `json:"pass"`
}

func TestPerf(t *testing.T) {
	slog.SetDefault(slog.New(slog.NewJSONHandler(io.Discard, nil))) // request logs would dominate the timings
	scale := 1.0
	if v, err := strconv.ParseFloat(os.Getenv("PERF_BUDGET_SCALE"), 64); err == nil && v > 0 {
		scale = v
	}
	requests := 300
	if v, err := strconv.Atoi(os.Getenv("PERF_REQUESTS")); err == nil && v > 0 {
		requests = v
	}

	cfg := config.Config{
		PublicAPIURL: "https://api.example.com", PortalBaseURL: "https://portal.example.com",
		WGTunnelCIDR: netip.MustParsePrefix("10.200.0.0/16"), WGServerPublicKey: "c2VydmVyLXB1YmxpYy1rZXktMzItYnl0ZXMtbG9uZyE=",
		WGServerEndpoint: "vpn.example.com:51820", RadiusSecretSeed: "seed", MpesaShortcode: "174379",
		AllowedOrigins: []string{"http://localhost:3010"}, SessionTTL: time.Hour, TrustProxyHeaders: true,
	}
	sealer := testutil.Sealer(t)
	app := assemble(cfg, testutil.DB(t), sealer)
	app.Admin = &admin.Service{DB: testutil.AdminDB(t), Sealer: sealer}
	api := httptest.NewServer(Handler(app))
	defer api.Close()
	radius := httptest.NewServer(app.Sessions.Handler(radiusToken))
	defer radius.Close()
	client := &http.Client{Timeout: 10 * time.Second, Transport: &http.Transport{MaxIdleConnsPerHost: 64}}

	do := func(method, url, token string, body []byte, want int) map[string]any {
		t.Helper()
		req, _ := http.NewRequest(method, url, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		resp, err := client.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		raw, _ := io.ReadAll(resp.Body)
		if resp.StatusCode != want {
			t.Fatalf("%s %s = %d: %s", method, url, resp.StatusCode, raw)
		}
		out := map[string]any{}
		_ = json.Unmarshal(raw, &out)
		return out
	}
	js := func(v any) []byte { b, _ := json.Marshal(v); return b }

	// --- seed ---------------------------------------------------------------
	t0 := time.Now()
	signup := do("POST", api.URL+"/v1/auth/signup", "", js(map[string]any{"email": "owner@perf.example", "password": "longenough1",
		"business_name": "Perf Networks", "support_phone": "0712345678", "shortcode_type": "paybill", "shortcode": "174379"}), 201)
	token := signup["token"].(string)
	tn := signup["tenant"].(map[string]any)
	tenantID, slug := uuid.MustParse(tn["id"].(string)), tn["slug"].(string)

	ctx := context.Background()
	owner, err := pgx.Connect(ctx, testutil.OwnerURL(t))
	if err != nil {
		t.Fatal(err)
	}
	defer owner.Close(ctx)
	seed(t, ctx, owner, tenantID)

	// One real customer with a sealed password, for the RADIUS hot path.
	var plan string
	for _, p := range do("GET", api.URL+"/v1/plans", token, nil, 200)["plans"].([]any) {
		if pm := p.(map[string]any); pm["access_type"] == "pppoe" {
			plan = pm["id"].(string)
			break
		}
	}
	sub := do("POST", api.URL+"/v1/subscribers", token, js(map[string]any{"full_name": "Radius Load", "phone": "0712999888", "plan_id": plan, "start_now": true}), 201)["subscriber"].(map[string]any)
	pw := do("GET", api.URL+"/v1/subscribers/"+sub["id"].(string)+"/password", token, nil, 200)["pppoe_password"].(string)
	user := sub["account_id"].(string)
	var routerID, nas string
	if err := owner.QueryRow(ctx, `SELECT id::text, host(tunnel_ip) FROM routers WHERE tenant_id = $1 ORDER BY name LIMIT 1`, tenantID).Scan(&routerID, &nas); err != nil {
		t.Fatal(err)
	}

	// A staff account for the admin console.
	enr, err := app.Admin.CreateAdmin(ctx, "perf-admin@example.com", "Perf", "perf admin password")
	if err != nil {
		t.Fatal(err)
	}
	code, _ := totp.GenerateCode(enr.Secret, time.Now())
	adminToken := do("POST", api.URL+"/admin/v1/login", "", js(map[string]string{"email": "perf-admin@example.com", "password": "perf admin password", "code": code}), 200)["token"].(string)
	t.Logf("seeded in %s", time.Since(t0).Round(time.Millisecond))

	// --- budgets ------------------------------------------------------------
	ms := func(n float64) time.Duration { return time.Duration(n * scale * float64(time.Millisecond)) }
	floor := func(rps float64) float64 { return rps / scale }
	rad := func(attrs map[string]string) func(int) []byte {
		return func(i int) []byte {
			a := map[string]any{}
			for k, v := range attrs {
				a[k] = map[string]any{"type": "string", "value": []string{strings.ReplaceAll(v, "{i}", strconv.Itoa(i))}}
			}
			return js(a)
		}
	}
	radiusAuth := func(r *http.Request, _ int) { r.SetBasicAuth("freeradius", radiusToken) }
	phoneIP := func(r *http.Request, i int) {
		r.Header.Set("X-Forwarded-For", fmt.Sprintf("41.90.%d.%d", i/250%250, i%250+1))
	}

	budgets := []budget{
		{Name: "dashboard overview", Method: "GET", Path: "/v1/dashboard/overview", P95: ms(150), auth: token},
		{Name: "revenue (month)", Method: "GET", Path: "/v1/dashboard/revenue?period=month", P95: ms(150), auth: token},
		{Name: "revenue (week)", Method: "GET", Path: "/v1/dashboard/revenue?period=week", P95: ms(150), auth: token},
		{Name: "customers page", Method: "GET", Path: "/v1/subscribers?limit=50", P95: ms(120), auth: token},
		{Name: "customer search", Method: "GET", Path: "/v1/subscribers?q=wanjiru&limit=50", P95: ms(150), auth: token},
		{Name: "payments", Method: "GET", Path: "/v1/payments", P95: ms(120), auth: token},
		{Name: "routers list", Method: "GET", Path: "/v1/routers", P95: ms(150), auth: token},
		{Name: "network map", Method: "GET", Path: "/v1/network/map", P95: ms(150), auth: token},
		{Name: "router metrics 24h", Method: "GET", Path: "/v1/routers/" + routerID + "/metrics?range=24h", P95: ms(100), auth: token},
		{Name: "router metrics 7d", Method: "GET", Path: "/v1/routers/" + routerID + "/metrics?range=7d", P95: ms(100), auth: token},
		{Name: "router metrics 30d", Method: "GET", Path: "/v1/routers/" + routerID + "/metrics?range=30d", P95: ms(100), auth: token},
		{Name: "captive portal", Method: "GET", Path: "/v1/portal/" + slug + "/", P95: ms(60), MinRPS: floor(300), Conc: 32, header: phoneIP},
		{Name: "admin overview", Method: "GET", Path: "/admin/v1/overview", P95: ms(250), auth: adminToken},
		{Name: "admin ISP list", Method: "GET", Path: "/admin/v1/tenants", P95: ms(250), auth: adminToken},
		{Name: "admin ISP search", Method: "GET", Path: "/admin/v1/tenants?q=perf-isp-12", P95: ms(150), auth: adminToken},
		{Name: "RADIUS authorize (PPPoE)", Method: "POST", Path: radius.URL + "/radius/authorize?nas=" + nas, P95: ms(100), MinRPS: floor(400), Conc: 32,
			body: rad(map[string]string{"User-Name": user}), header: radiusAuth},
		{Name: "RADIUS authorize (unpaid MAC)", Method: "POST", Path: radius.URL + "/radius/authorize?nas=" + nas, P95: ms(100), MinRPS: floor(400), Conc: 32,
			body: rad(map[string]string{"User-Name": "AA:BB:CC:00:{i}:01"}), header: radiusAuth},
		{Name: "RADIUS accounting start", Method: "POST", Path: radius.URL + "/radius/accounting?nas=" + nas, P95: ms(100), MinRPS: floor(300), Conc: 32, wantCode: 204,
			body: rad(map[string]string{"User-Name": user, "Acct-Status-Type": "Start", "Acct-Session-Id": "perf-{i}", "Framed-IP-Address": "10.10.0.9"}), header: radiusAuth},
		{Name: "RADIUS accounting interim", Method: "POST", Path: radius.URL + "/radius/accounting?nas=" + nas, P95: ms(100), MinRPS: floor(300), Conc: 32, wantCode: 204,
			body: rad(map[string]string{"User-Name": user, "Acct-Status-Type": "Interim-Update", "Acct-Session-Id": "perf-{i}", "Acct-Input-Octets": "{i}000", "Acct-Session-Time": "60"}), header: radiusAuth},
	}

	// --- run ----------------------------------------------------------------
	var results []result
	for _, b := range budgets {
		url := b.Path
		if !strings.HasPrefix(url, "http") {
			url = api.URL + url
		}
		want := b.wantCode
		if want == 0 {
			want = 200
		}
		send := func(i int) (time.Duration, error) {
			var body io.Reader
			if b.body != nil {
				body = bytes.NewReader(b.body(i))
			}
			req, _ := http.NewRequest(b.Method, url, body)
			if b.auth != "" {
				req.Header.Set("Authorization", "Bearer "+b.auth)
			}
			if b.header != nil {
				b.header(req, i)
			}
			start := time.Now()
			resp, err := client.Do(req)
			if err != nil {
				return 0, err
			}
			raw, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			d := time.Since(start)
			if resp.StatusCode != want {
				return d, fmt.Errorf("status %d: %.200s", resp.StatusCode, raw)
			}
			if b.Name == "RADIUS authorize (PPPoE)" && !bytes.Contains(raw, []byte(pw)) {
				return d, fmt.Errorf("authorize did not accept the customer: %.200s", raw)
			}
			return d, nil
		}
		for i := 0; i < 10; i++ { // warm caches and the connection pool
			if _, err := send(1_000_000 + i); err != nil {
				t.Fatalf("%s: %v", b.Name, err)
			}
		}
		if b.Conc == 0 {
			b.Conc = 4
		}
		lat, errs, wall := load(requests, b.Conc, send)
		r := summarize(b, lat, errs, wall)
		results = append(results, r)
		if errs > 0 {
			t.Errorf("%s: %d of %d requests failed", b.Name, errs, requests)
		}
		if !r.Pass {
			t.Errorf("%s: p95 %.1fms (budget %.0fms), %.0f req/s (budget %.0f)", b.Name, r.P95ms, r.BudgetMs, r.RPS, r.MinRPS)
		}
	}
	report(t, results, scale)
}

// load sends n requests from c workers and returns each latency.
func load(n, c int, send func(i int) (time.Duration, error)) ([]time.Duration, int, time.Duration) {
	var (
		mu   sync.Mutex
		lat  = make([]time.Duration, 0, n)
		errs int
		wg   sync.WaitGroup
		jobs = make(chan int)
	)
	start := time.Now()
	for w := 0; w < c; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range jobs {
				d, err := send(i)
				mu.Lock()
				if err != nil {
					errs++
				} else {
					lat = append(lat, d)
				}
				mu.Unlock()
			}
		}()
	}
	for i := 0; i < n; i++ {
		jobs <- i
	}
	close(jobs)
	wg.Wait()
	return lat, errs, time.Since(start)
}

func summarize(b budget, lat []time.Duration, errs int, wall time.Duration) result {
	sort.Slice(lat, func(i, j int) bool { return lat[i] < lat[j] })
	pct := func(p float64) float64 {
		if len(lat) == 0 {
			return 0
		}
		return float64(lat[int(p*float64(len(lat)-1))].Microseconds()) / 1000
	}
	r := result{Name: b.Name, Requests: len(lat) + errs, Errors: errs, P50ms: pct(.50), P95ms: pct(.95), P99ms: pct(.99),
		RPS: float64(len(lat)+errs) / wall.Seconds(), BudgetMs: float64(b.P95.Microseconds()) / 1000, MinRPS: b.MinRPS, Conc: b.Conc}
	r.Pass = errs == 0 && r.P95ms <= r.BudgetMs && r.RPS >= b.MinRPS
	return r
}

func report(t *testing.T, results []result, scale float64) {
	var md strings.Builder
	fmt.Fprintf(&md, "| Endpoint | Clients | p50 ms | p95 ms | p99 ms | req/s | Budget | Result |\n|---|--:|--:|--:|--:|--:|--:|---|\n")
	for _, r := range results {
		mark := "pass"
		if !r.Pass {
			mark = "**FAIL**"
		}
		rps := ""
		if r.MinRPS > 0 {
			rps = fmt.Sprintf(" · ≥%.0f/s", r.MinRPS)
		}
		fmt.Fprintf(&md, "| %s | %d | %.1f | %.1f | %.1f | %.0f | p95 %.0f ms%s | %s |\n", r.Name, r.Conc, r.P50ms, r.P95ms, r.P99ms, r.RPS, r.BudgetMs, rps, mark)
	}
	fmt.Fprintf(&md, "\nData: %d routers × 31 days of metrics, %d customers, %d payments, %d sessions, %d other ISPs. Budget scale ×%.1f.\n",
		perfRouters, perfSubscribers, perfPayments*2, perfSessions+3000, perfOtherISPs, scale)
	t.Log("\n" + md.String())
	dir := os.Getenv("PERF_REPORT")
	if dir == "" {
		return
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	raw, _ := json.MarshalIndent(results, "", "  ")
	_ = os.WriteFile(filepath.Join(dir, "api-perf.json"), raw, 0o644)
	_ = os.WriteFile(filepath.Join(dir, "api-perf.md"), []byte("## API + RADIUS\n\n"+md.String()), 0o644)
}

// seed bulk-loads a large ISP as the schema owner. Rows that the API never
// decrypts get a placeholder ciphertext.
func seed(t *testing.T, ctx context.Context, c *pgx.Conn, tid uuid.UUID) {
	t.Helper()
	steps := []struct{ name, sql string }{
		{"locations", `INSERT INTO locations (tenant_id, name, lat, lng)
			SELECT $1, 'Site ' || g, -1.2 + g * 0.01, 36.8 + g * 0.01 FROM generate_series(1, 10) g`},
		{"routers", `INSERT INTO routers (tenant_id, location_id, name, board_name, firmware_version, tunnel_ip, wg_public_key,
				api_password_enc, status, last_seen_at, status_changed_at)
			SELECT $1, (SELECT id FROM locations WHERE tenant_id = $1 ORDER BY name OFFSET g % 10 LIMIT 1),
				'Mast ' || lpad(g::text, 2, '0'), 'hAP ax3', '7.15.2', '10.200.50.0'::inet + g, 'perf-wg-' || g,
				'\x00', CASE WHEN g % 20 = 0 THEN 'offline' ELSE 'online' END, now(), now() - interval '3 hours'
			FROM generate_series(1, ` + strconv.Itoa(perfRouters) + `) g`},
		{"router metrics (minutes)", `INSERT INTO router_metrics (tenant_id, router_id, at, resolution_sec, cpu_load, mem_used_pct, uptime_sec,
				pppoe_users, hotspot_users, uplink, rx_bytes, tx_bytes, rx_bps, tx_bps)
			SELECT $1, r.id, date_trunc('minute', ts), 60, (random() * 60)::int, 30 + (random() * 30)::int, 86400,
				(random() * 150)::int, (random() * 80)::int, 'ether1', 0, 0, (random() * 5e7)::bigint, (random() * 1e7)::bigint
			FROM routers r, generate_series(now() - interval '48 hours', now(), interval '1 minute') ts WHERE r.tenant_id = $1`},
		{"router metrics (hours)", `INSERT INTO router_metrics (tenant_id, router_id, at, resolution_sec, cpu_load, mem_used_pct, uptime_sec,
				pppoe_users, hotspot_users, uplink, rx_bytes, tx_bytes, rx_bps, tx_bps)
			SELECT $1, r.id, date_trunc('hour', ts), 3600, (random() * 60)::int, 30 + (random() * 30)::int, 86400,
				(random() * 150)::int, (random() * 80)::int, 'ether1', 0, 0, (random() * 5e7)::bigint, (random() * 1e7)::bigint
			FROM routers r, generate_series(now() - interval '31 days', now() - interval '49 hours', interval '1 hour') ts WHERE r.tenant_id = $1`},
		{"neighbors", `INSERT INTO router_neighbors (tenant_id, router_id, interface, mac_address, identity, address, platform)
			SELECT $1, a.id, 'ether2', 'AA:00:00:00:' || lpad(to_hex(a.n), 2, '0') || ':02', b.name, '192.168.50.' || b.n, 'MikroTik'
			FROM (SELECT id, name, row_number() OVER (ORDER BY name) n FROM routers WHERE tenant_id = $1) a
			JOIN (SELECT id, name, row_number() OVER (ORDER BY name) n FROM routers WHERE tenant_id = $1) b ON b.n = a.n + 1`},
		{"customers", `INSERT INTO subscribers (tenant_id, location_id, full_name, phone_number, pppoe_username, pppoe_password_enc,
				status, plan_id, next_renewal_at, created_at)
			SELECT $1, (SELECT id FROM locations WHERE tenant_id = $1 ORDER BY name OFFSET g % 10 LIMIT 1),
				(ARRAY['Wanjiru','Otieno','Achieng','Kamau','Njeri','Mutua','Chebet','Kiprop','Auma','Mwangi'])[1 + g % 10] || ' ' ||
				(ARRAY['Kariuki','Odhiambo','Wafula','Mohamed','Njoroge','Kilonzo','Rotich','Barasa'])[1 + g / 10 % 8],
				'2547' || lpad(g::text, 8, '0'), t.account_prefix || (20000 + g), '\x00',
				CASE WHEN g % 9 = 0 THEN 'expired' WHEN g % 31 = 0 THEN 'suspended' ELSE 'active' END,
				(SELECT id FROM plans WHERE tenant_id = $1 AND access_type = 'pppoe' ORDER BY price_cents OFFSET g % 3 LIMIT 1),
				now() + (g % 30) * interval '1 day', now() - (g % 365) * interval '1 day'
			FROM generate_series(1, ` + strconv.Itoa(perfSubscribers) + `) g, tenants t WHERE t.id = $1`},
		{"account numbers", `UPDATE tenants SET next_account_no = 40000 WHERE id = $1`},
		{"PPPoE payments", `INSERT INTO mpesa_transactions (tenant_id, source, merchant_request_id, checkout_request_id, mpesa_receipt_number,
				phone_number, amount_cents, account_reference, status, result_code, subscriber_id, callback_received_at, created_at)
			SELECT $1, CASE WHEN g % 3 = 0 THEN 'c2b' ELSE 'stk' END, 'perf-m-' || g, 'perf-c-' || g, 'PF' || lpad(g::text, 8, '0'),
				s.phone_number, 150000, s.pppoe_username, CASE WHEN g % 25 = 0 THEN 'failed' ELSE 'success' END, 0, s.id, ts, ts
			FROM (SELECT g, now() - random() * interval '90 days' ts FROM generate_series(1, ` + strconv.Itoa(perfPayments) + `) g) x
			JOIN (SELECT id, phone_number, pppoe_username, row_number() OVER () - 1 rn FROM subscribers WHERE tenant_id = $1) s
				ON s.rn = x.g % ` + strconv.Itoa(perfSubscribers)},
		{"Hotspot purchases", `INSERT INTO hotspot_purchases (tenant_id, router_id, plan_id, source, phone_number, mpesa_receipt_number,
				macs, starts_at, expires_at, created_at)
			SELECT $1, (SELECT id FROM routers WHERE tenant_id = $1 ORDER BY name OFFSET g % 60 LIMIT 1),
				(SELECT id FROM plans WHERE tenant_id = $1 AND access_type = 'hotspot' ORDER BY price_cents LIMIT 1),
				'mpesa', '2547' || lpad((g % 50000)::text, 8, '0'), 'PH' || lpad(g::text, 8, '0'),
				ARRAY['02:00:00:' || lpad(to_hex(g / 65536 % 256), 2, '0') || ':' || lpad(to_hex(g / 256 % 256), 2, '0') || ':' || lpad(to_hex(g % 256), 2, '0')],
				ts, ts + interval '1 hour', ts
			FROM (SELECT g, now() - random() * interval '90 days' ts FROM generate_series(1, ` + strconv.Itoa(perfPayments) + `) g) x`},
		{"Hotspot payments", `INSERT INTO mpesa_transactions (tenant_id, source, merchant_request_id, checkout_request_id, mpesa_receipt_number,
				phone_number, amount_cents, account_reference, status, result_code, hotspot_purchase_id, callback_received_at, created_at)
			SELECT $1, 'stk', 'perf-hm-' || p.mpesa_receipt_number, 'perf-hc-' || p.mpesa_receipt_number, p.mpesa_receipt_number,
				p.phone_number, 5000, left(p.id::text, 8), 'success', 0, p.id, p.created_at, p.created_at
			FROM hotspot_purchases p WHERE p.tenant_id = $1`},
		{"sessions", `INSERT INTO sessions (tenant_id, router_id, plan_id, access_type, username, acct_session_id, status, started_at,
				terminated_at, termination_cause, bytes_in, bytes_out, session_time_sec)
			SELECT $1, (SELECT id FROM routers WHERE tenant_id = $1 ORDER BY name OFFSET g % 60 LIMIT 1), NULL, 'pppoe',
				t.account_prefix || (20000 + g % ` + strconv.Itoa(perfSubscribers) + ` + 1), 'perf-s-' || g,
				CASE WHEN g <= 3000 THEN 'active' ELSE 'terminated' END, now() - (g % 720) * interval '1 hour',
				CASE WHEN g <= 3000 THEN NULL ELSE now() - (g % 700) * interval '1 hour' END,
				CASE WHEN g <= 3000 THEN NULL ELSE 'User-Request' END, g * 1000, g * 4000, 3600
			FROM generate_series(1, ` + strconv.Itoa(perfSessions+3000) + `) g, tenants t WHERE t.id = $1`},
		{"other ISPs", `INSERT INTO tenants (id, email, password_hash, name, slug, account_prefix, callback_token, dek_wrapped,
				subscription_status, trial_ends_at, subscription_expires_at, sms_credits, created_at)
			SELECT gen_random_uuid(), 'isp' || g || '@perf.example', 'x', 'Perf ISP ' || g, 'perf-isp-' || g,
				'X' || chr(65 + g / 26 % 26) || chr(65 + g % 26), 'perf-token-' || g, '\x00',
				(ARRAY['trial','active','lapsed'])[1 + g % 3], now() + (g % 20 - 5) * interval '1 day',
				CASE WHEN g % 3 = 1 THEN now() + interval '20 days' END, g % 400, now() - g * interval '1 day'
			FROM generate_series(1, ` + strconv.Itoa(perfOtherISPs) + `) g`},
		{"analyze", `ANALYZE`},
	}
	for _, s := range steps {
		start := time.Now()
		var err error
		if strings.Contains(s.sql, "$1") {
			_, err = c.Exec(ctx, s.sql, tid)
		} else {
			_, err = c.Exec(ctx, s.sql)
		}
		if err != nil {
			t.Fatalf("seed %s: %v", s.name, err)
		}
		t.Logf("seed %-24s %s", s.name, time.Since(start).Round(time.Millisecond))
	}
}
