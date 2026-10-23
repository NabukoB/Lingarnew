package admin_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"

	"github.com/nabukob/lingarnew/wisp-saas/internal/admin"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil/fixtures"
)

func code(t *testing.T, secret string, at time.Time) string {
	t.Helper()
	c, err := totp.GenerateCodeCustom(secret, at, totp.ValidateOpts{Period: 30, Digits: otp.DigitsSix, Algorithm: otp.AlgorithmSHA1})
	if err != nil {
		t.Fatal(err)
	}
	return c
}

func code401(t *testing.T, err error) {
	t.Helper()
	var he *httpx.Error
	if !errors.As(err, &he) || he.Code != "ADMIN_LOGIN_FAILED" {
		t.Fatalf("want ADMIN_LOGIN_FAILED, got %v", err)
	}
}

func TestLoginNeedsPasswordAndFreshCode(t *testing.T) {
	ctx := context.Background()
	now := time.Now()
	s := &admin.Service{DB: testutil.AdminDB(t), Sealer: testutil.Sealer(t), Now: func() time.Time { return now }}
	email := "ops-" + now.Format("150405.000000") + "@example.com"

	if _, err := s.CreateAdmin(ctx, email, "Ops", "short"); err == nil {
		t.Fatal("short password accepted")
	}
	e, err := s.CreateAdmin(ctx, email, "Ops", "a long admin password")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(e.URL, "otpauth://totp/") || len(e.Secret) < 16 {
		t.Fatalf("enrollment = %+v", e)
	}
	if _, err := s.CreateAdmin(ctx, strings.ToUpper(email), "Ops", "a long admin password"); err == nil {
		t.Fatal("duplicate email accepted")
	}

	_, _, err = s.Login(ctx, email, "wrong password!!", code(t, e.Secret, now), "1.2.3.4")
	code401(t, err)
	_, _, err = s.Login(ctx, email, "a long admin password", "000000", "1.2.3.4")
	code401(t, err)
	_, _, err = s.Login(ctx, "nobody@example.com", "a long admin password", code(t, e.Secret, now), "1.2.3.4")
	code401(t, err)

	c := code(t, e.Secret, now)
	token, exp, err := s.Login(ctx, email, "a long admin password", c, "1.2.3.4")
	if err != nil || token == "" || exp.Before(now) {
		t.Fatalf("login: %q %v %v", token, exp, err)
	}
	// The same code cannot be used twice, even within its 30 seconds.
	_, _, err = s.Login(ctx, email, "a long admin password", c, "1.2.3.4")
	code401(t, err)
	// The next step's code works (clock skew of one step is allowed).
	now = now.Add(30 * time.Second)
	if _, _, err := s.Login(ctx, email, "a long admin password", code(t, e.Secret, now), "1.2.3.4"); err != nil {
		t.Fatalf("next code: %v", err)
	}

	// Session works through the HTTP middleware; logout ends it.
	r := chi.NewRouter()
	s.Routes(r, func(*http.Request) string { return "1.2.3.4" })
	get := func(path, tok string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		if tok != "" {
			req.Header.Set("Authorization", "Bearer "+tok)
		}
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w
	}
	if w := get("/admin/v1/me", token); w.Code != 200 || !strings.Contains(w.Body.String(), email) {
		t.Fatalf("me: %d %s", w.Code, w.Body)
	}
	if w := get("/admin/v1/me", ""); w.Code != 401 {
		t.Fatalf("no token: %d", w.Code)
	}
	if w := get("/admin/v1/overview", "not-a-token"); w.Code != 401 {
		t.Fatalf("bad token: %d", w.Code)
	}
	if err := s.Logout(ctx, token); err != nil {
		t.Fatal(err)
	}
	if w := get("/admin/v1/me", token); w.Code != 401 {
		t.Fatalf("after logout: %d", w.Code)
	}
}

func TestTenantChangesAreAudited(t *testing.T) {
	ctx := context.Background()
	app := testutil.DB(t)
	sealer := testutil.Sealer(t)
	tn := fixtures.Tenant(t, app, sealer, "Console Test WiFi")
	s := &admin.Service{DB: testutil.AdminDB(t), Sealer: sealer}
	e, err := s.CreateAdmin(ctx, "audit-"+tn.Slug+"@example.com", "Auditor", "a long admin password")
	if err != nil {
		t.Fatal(err)
	}

	rows, err := s.Tenants(ctx, "Console Test", "trial")
	if err != nil || len(rows) == 0 || rows[0].ID != tn.ID || rows[0].Standing != "trial" {
		t.Fatalf("tenants = %+v, %v", rows, err)
	}
	if rows, _ := s.Tenants(ctx, "Console Test", "paying"); len(rows) != 0 {
		t.Fatal("standing filter ignored")
	}
	if rows, _ := s.Tenants(ctx, "Console Test", "unpaid"); len(rows) != 0 {
		t.Fatal("a trial ISP counted as unpaid")
	}

	before := tn.TrialEndsAt
	tr, err := s.ExtendTrial(ctx, e.AdminID, tn.ID, 7, "slow onboarding")
	if err != nil || tr.TrialEndsAt.Sub(before) < 6*24*time.Hour {
		t.Fatalf("extend trial: %+v %v", tr, err)
	}
	if _, err := s.ExtendTrial(ctx, e.AdminID, tn.ID, 0, ""); err == nil {
		t.Fatal("0 days accepted")
	}
	sub, err := s.AddSubscription(ctx, e.AdminID, tn.ID, 2, "paid by bank transfer")
	if err != nil || sub.SubscriptionStatus != "active" || sub.SubscriptionExpiresAt == nil || time.Until(*sub.SubscriptionExpiresAt) < 55*24*time.Hour {
		t.Fatalf("subscription: %+v %v", sub, err)
	}
	var he *httpx.Error
	if _, err := s.ExtendTrial(ctx, e.AdminID, tn.ID, 7, ""); !errors.As(err, &he) || he.Code != "ALREADY_PAYING" {
		t.Fatalf("trial on a paying ISP: %v", err)
	}
	if _, err := s.GrantSMSCredits(ctx, e.AdminID, tn.ID, 100, ""); err == nil {
		t.Fatal("credits without a note accepted")
	}
	cr, err := s.GrantSMSCredits(ctx, e.AdminID, tn.ID, 100, "refund for failed top-up")
	if err != nil || cr.SmsCredits != tn.SmsCredits+100 {
		t.Fatalf("credits: %+v %v", cr, err)
	}

	d, err := s.Tenant(ctx, tn.ID)
	if err != nil || d.Standing != "paying" || d.SmsCredits != tn.SmsCredits+100 || len(d.Audit) != 3 {
		t.Fatalf("detail: standing=%s credits=%d audit=%d %v", d.Standing, d.SmsCredits, len(d.Audit), err)
	}
	var p map[string]any
	_ = json.Unmarshal(d.Audit[0].Payload, &p)
	if d.Audit[0].Action != "GRANT_SMS_CREDITS" || p["note"] != "refund for failed top-up" || d.Audit[0].AdminEmail != "audit-"+tn.Slug+"@example.com" {
		t.Fatalf("latest audit = %+v %v", d.Audit[0], p)
	}

	// The API sends the payload as a JSON object, not base64 bytes.
	if b, _ := json.Marshal(d.Audit[0]); !strings.Contains(string(b), `"payload":{"`) {
		t.Fatalf("audit JSON = %s", b)
	}

	o, err := s.Overview(ctx)
	if err != nil || o.Counts.Tenants < 1 || o.Counts.Paying < 1 || len(o.Income) != 30 {
		t.Fatalf("overview: %+v %v", o.Counts, err)
	}
}

func TestRolesKeepTheirDistance(t *testing.T) {
	ctx := context.Background()
	app := testutil.DB(t)
	adm := testutil.AdminDB(t)
	fixtures.Tenant(t, app, testutil.Sealer(t), "Distance WiFi")

	// The console's role cannot read secrets or change anything but billing fields.
	for _, q := range []string{
		"SELECT password_hash FROM tenants LIMIT 1",
		"SELECT dek_wrapped FROM tenants LIMIT 1",
		"SELECT pppoe_password_enc FROM subscribers LIMIT 1",
		"SELECT phone_number FROM mpesa_transactions LIMIT 1",
		"SELECT api_password_enc FROM routers LIMIT 1",
		"UPDATE tenants SET name = 'x'",
		"SELECT 1 FROM vouchers LIMIT 1",
	} {
		if _, err := adm.Pool.Exec(ctx, q); err == nil || !strings.Contains(err.Error(), "permission denied") {
			t.Errorf("admin role ran %q: %v", q, err)
		}
	}
	// The API's role cannot see staff tables at all.
	for _, q := range []string{"SELECT 1 FROM platform_admins", "SELECT 1 FROM admin_sessions", "SELECT 1 FROM admin_audit"} {
		if _, err := app.Pool.Exec(ctx, q); err == nil || !strings.Contains(err.Error(), "permission denied") {
			t.Errorf("app role ran %q: %v", q, err)
		}
	}
	// Admin queries see across tenants; on the app pool they see nothing.
	var n int
	_ = app.WithoutTenant(ctx, func(q *store.Queries) error {
		rows, err := q.AdminTenants(ctx, store.AdminTenantsParams{Q: "", Lim: 10})
		n = len(rows)
		return err
	})
	if n != 0 {
		t.Fatalf("app pool saw %d tenants through admin queries", n)
	}
}

func TestStanding(t *testing.T) {
	now := time.Now()
	past, future := now.Add(-time.Hour), now.Add(time.Hour)
	cases := []struct {
		status  string
		trial   time.Time
		expires *time.Time
		want    string
	}{
		{"trial", future, nil, "trial"},
		{"trial", past, nil, "trial_ended"},
		{"active", past, &future, "paying"},
		{"active", past, nil, "paying"},
		{"active", past, &past, "expired"},
		{"lapsed", past, &past, "lapsed"},
	}
	for _, c := range cases {
		if got := admin.Standing(c.status, c.trial, c.expires, now); got != c.want {
			t.Errorf("Standing(%s) = %s, want %s", c.status, got, c.want)
		}
	}
}

// An ISP whose sessions are gone (signed out, or expired and purged) has no
// last sign-in; it must not break the list or the detail page.
func TestTenantWithoutSessions(t *testing.T) {
	ctx := context.Background()
	app := testutil.DB(t)
	sealer := testutil.Sealer(t)
	tn := fixtures.Tenant(t, app, sealer, "Signed Out WiFi")
	owner, err := pgx.Connect(ctx, testutil.OwnerURL(t))
	if err != nil {
		t.Fatal(err)
	}
	defer owner.Close(ctx)
	if _, err := owner.Exec(ctx, `DELETE FROM auth_sessions WHERE tenant_id = $1`, tn.ID); err != nil {
		t.Fatal(err)
	}

	s := &admin.Service{DB: testutil.AdminDB(t), Sealer: sealer}
	rows, err := s.Tenants(ctx, "Signed Out WiFi", "")
	if err != nil || len(rows) != 1 || rows[0].LastLoginAt != nil {
		t.Fatalf("tenants = %+v, %v", rows, err)
	}
	d, err := s.Tenant(ctx, tn.ID)
	if err != nil || d.LastLoginAt != nil {
		t.Fatalf("tenant = %+v, %v", d, err)
	}
}
