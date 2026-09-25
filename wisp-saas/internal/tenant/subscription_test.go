package tenant

import (
	"testing"
	"time"

	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
)

func TestSubscriptionActive(t *testing.T) {
	now := time.Now()
	past, future := now.Add(-time.Hour), now.Add(time.Hour)
	cases := []struct {
		t    store.Tenant
		want bool
	}{
		{store.Tenant{SubscriptionStatus: "trial", TrialEndsAt: future}, true},
		{store.Tenant{SubscriptionStatus: "trial", TrialEndsAt: past}, false},
		{store.Tenant{SubscriptionStatus: "active", SubscriptionExpiresAt: &future}, true},
		{store.Tenant{SubscriptionStatus: "active", SubscriptionExpiresAt: &past}, false},
		{store.Tenant{SubscriptionStatus: "lapsed", SubscriptionExpiresAt: &future}, false},
	}
	for i, c := range cases {
		if got := SubscriptionActive(c.t, now); got != c.want {
			t.Errorf("case %d: got %v", i, got)
		}
		if err := RequireSubscription(c.t, now); (err == nil) != c.want {
			t.Errorf("case %d: RequireSubscription = %v", i, err)
		}
	}
}
