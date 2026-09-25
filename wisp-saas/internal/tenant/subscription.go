package tenant

import (
	"net/http"
	"time"

	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
)

// ErrSubscriptionExpired blocks deploys, new routers and config changes when
// the WISP has not paid us. End users who already paid are never cut off.
var ErrSubscriptionExpired = httpx.NewError(http.StatusPaymentRequired, "SUBSCRIPTION_EXPIRED",
	"Subscription expired, top up in Billing.",
	"Pay the monthly fee under Billing → Subscription. Your customers stay online meanwhile.")

// SubscriptionActive reports whether the WISP's own subscription (trial or
// paid) is current.
func SubscriptionActive(t store.Tenant, now time.Time) bool {
	switch t.SubscriptionStatus {
	case "trial":
		return now.Before(t.TrialEndsAt)
	case "active":
		return t.SubscriptionExpiresAt == nil || now.Before(*t.SubscriptionExpiresAt)
	}
	return false
}

// RequireSubscription returns ErrSubscriptionExpired when the subscription lapsed.
func RequireSubscription(t store.Tenant, now time.Time) error {
	if !SubscriptionActive(t, now) {
		return ErrSubscriptionExpired
	}
	return nil
}
