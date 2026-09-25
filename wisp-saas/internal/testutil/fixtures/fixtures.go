// Package fixtures creates realistic tenants for integration tests.
package fixtures

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/nabukob/lingarnew/wisp-saas/internal/auth"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/db"
	"github.com/nabukob/lingarnew/wisp-saas/internal/secrets"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
	"github.com/nabukob/lingarnew/wisp-saas/internal/tenant"
)

// Tenant signs up a WISP with starter plans and returns it.
func Tenant(t testing.TB, d *db.DB, s *secrets.Sealer, name string) store.Tenant {
	t.Helper()
	svc := &tenant.Service{DB: d, Sealer: s, Auth: &auth.Service{DB: d, TTL: time.Hour}}
	tn, _, err := svc.Signup(context.Background(), tenant.SignupInput{
		Email: uuid.NewString()[:8] + "@example.com", Password: "longenough", BusinessName: name,
		SupportPhone: "0712345678", ShortcodeType: "paybill", Shortcode: "123456",
	})
	if err != nil {
		t.Fatalf("fixture tenant: %v", err)
	}
	return tn
}

// Plan returns the tenant's first plan of the given access type.
func Plan(t testing.TB, d *db.DB, tenantID uuid.UUID, accessType, name string) store.Plan {
	t.Helper()
	var out store.Plan
	err := d.WithTenant(context.Background(), tenantID, func(q *store.Queries) error {
		ps, err := q.ListPlans(context.Background(), &accessType)
		for _, p := range ps {
			if name == "" || p.Name == name {
				out = p
				return err
			}
		}
		return err
	})
	if err != nil || out.ID == uuid.Nil {
		t.Fatalf("fixture plan %s/%s: %v", accessType, name, err)
	}
	return out
}
