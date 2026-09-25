package tenant

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/nabukob/lingarnew/wisp-saas/internal/auth"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil"
)

func newService(t *testing.T) *Service {
	d := testutil.DB(t)
	return &Service{DB: d, Sealer: testutil.Sealer(t), Auth: &auth.Service{DB: d, TTL: time.Hour}}
}

func signup(t *testing.T, s *Service, name string) (store.Tenant, string) {
	t.Helper()
	tn, token, err := s.Signup(context.Background(), SignupInput{
		Email: strings.ToLower(strings.ReplaceAll(name, " ", "")) + uuid.NewString()[:6] + "@example.com",
		Password: "longenough", BusinessName: name, SupportPhone: "0712345678",
	})
	if err != nil {
		t.Fatalf("signup %s: %v", name, err)
	}
	return tn, token
}

func TestSignupSeedsDefaultsAndLogsIn(t *testing.T) {
	s := newService(t)
	ctx := context.Background()
	tn, token := signup(t, s, "Jazmoge WiFi")
	if token == "" || tn.SupportPhone == nil || *tn.SupportPhone != "254712345678" {
		t.Fatalf("unexpected tenant %+v token %q", tn, token)
	}
	var plans []store.Plan
	if err := s.DB.WithTenant(ctx, tn.ID, func(q *store.Queries) error {
		var err error
		plans, err = q.ListPlans(ctx, nil)
		return err
	}); err != nil {
		t.Fatal(err)
	}
	if len(plans) != 7 {
		t.Fatalf("want 7 starter plans, got %d", len(plans))
	}
	if _, _, err := s.Auth.Login(ctx, tn.Email, "longenough"); err != nil {
		t.Fatalf("login: %v", err)
	}
	if _, _, err := s.Auth.Login(ctx, tn.Email, "wrong-password"); err == nil {
		t.Fatal("login with wrong password succeeded")
	}
}

func TestSignupPicksUniquePrefixAndRejectsDuplicateEmail(t *testing.T) {
	s := newService(t)
	ctx := context.Background()
	a, _ := signup(t, s, "Kilimo Net")
	b, _ := signup(t, s, "Kilimo Net")
	if a.AccountPrefix == b.AccountPrefix || a.Slug == b.Slug {
		t.Fatalf("prefix/slug collision: %s/%s vs %s/%s", a.AccountPrefix, a.Slug, b.AccountPrefix, b.Slug)
	}
	_, _, err := s.Signup(ctx, SignupInput{Email: strings.ToUpper(a.Email), Password: "longenough", BusinessName: "Other"})
	var he *httpx.Error
	if !errors.As(err, &he) || he.Code != "EMAIL_TAKEN" {
		t.Fatalf("duplicate email: got %v", err)
	}
	_, _, err = s.Signup(ctx, SignupInput{Email: "x" + a.Email, Password: "longenough", BusinessName: "Other", AccountPrefix: a.AccountPrefix})
	if !errors.As(err, &he) || he.Code != "PREFIX_TAKEN" {
		t.Fatalf("taken prefix: got %v", err)
	}
}

func TestRowLevelSecurityIsolatesTenants(t *testing.T) {
	s := newService(t)
	ctx := context.Background()
	a, _ := signup(t, s, "Alpha Net")
	b, _ := signup(t, s, "Beta Net")

	var aPlans, bPlans []store.Plan
	_ = s.DB.WithTenant(ctx, a.ID, func(q *store.Queries) error { aPlans, _ = q.ListPlans(ctx, nil); return nil })
	_ = s.DB.WithTenant(ctx, b.ID, func(q *store.Queries) error { bPlans, _ = q.ListPlans(ctx, nil); return nil })
	if len(aPlans) == 0 || len(bPlans) == 0 {
		t.Fatal("tenants should see their own plans")
	}
	aPlan := aPlans[0].ID

	// B cannot read A's plan by ID.
	err := s.DB.WithTenant(ctx, b.ID, func(q *store.Queries) error {
		_, err := q.GetPlan(ctx, aPlan)
		return err
	})
	if err == nil {
		t.Fatal("tenant B read tenant A's plan")
	}

	// No tenant set: nothing is visible.
	_ = s.DB.WithoutTenant(ctx, func(q *store.Queries) error {
		p, err := q.ListPlans(ctx, nil)
		if err != nil || len(p) != 0 {
			t.Errorf("without tenant: %d plans, err %v", len(p), err)
		}
		_, err = q.GetTenant(ctx)
		if err == nil {
			t.Error("GetTenant without tenant returned a row")
		}
		return nil
	})

	// B cannot update A's plan (UPDATE sees zero rows).
	err = s.DB.WithTenant(ctx, b.ID, func(q *store.Queries) error {
		_, err := q.UpdatePlan(ctx, store.UpdatePlanParams{ID: aPlan, Name: "hijacked", PriceCents: 1, BandwidthDownKbps: 1, BandwidthUpKbps: 1, MaxDevices: 1, IsActive: true})
		return err
	})
	if err == nil {
		t.Fatal("tenant B updated tenant A's plan")
	}

	// Writing a row for another tenant is rejected by WITH CHECK.
	tx, err := s.DB.Pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, "SELECT set_config('app.current_tenant_id', $1, true)", b.ID.String()); err != nil {
		t.Fatal(err)
	}
	_, err = tx.Exec(ctx, "INSERT INTO locations (tenant_id, name) VALUES ($1, 'sneaky')", a.ID)
	if err == nil {
		t.Fatal("inserted a row for another tenant")
	}
}

func TestSettingsValidationAndOwnCredentials(t *testing.T) {
	s := newService(t)
	ctx := context.Background()
	tn, _ := signup(t, s, "Gamma Net")
	in := SettingsInput{Name: "Gamma Net", MpesaMode: "own", MpesaShortcodeType: "paybill", MpesaShortcode: "123456", PrimaryColor: "#0a776b"}
	_, err := s.UpdateSettings(ctx, tn.ID, in)
	var he *httpx.Error
	if !errors.As(err, &he) || he.Code != "MPESA_CREDENTIALS_MISSING" {
		t.Fatalf("own mode without creds: %v", err)
	}
	if err := s.SetMpesaCredentials(ctx, tn.ID, MpesaCredentials{ConsumerKey: "ck", ConsumerSecret: "cs", Passkey: "pk"}); err != nil {
		t.Fatal(err)
	}
	updated, err := s.UpdateSettings(ctx, tn.ID, in)
	if err != nil {
		t.Fatal(err)
	}
	creds, err := s.OwnMpesaCredentials(ctx, updated)
	if err != nil || creds.Passkey != "pk" {
		t.Fatalf("credentials round trip: %+v %v", creds, err)
	}
	if v := ToView(updated); !v.MpesaOwnCredentialsSet || v.MpesaMode != "own" {
		t.Fatalf("view: %+v", v)
	}
	in.PrimaryColor = "blue"
	if _, err := s.UpdateSettings(ctx, tn.ID, in); err == nil {
		t.Fatal("accepted a bad colour")
	}
}
