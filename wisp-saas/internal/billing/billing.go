// Package billing runs every M-Pesa money flow: STK Push for PPPoE renewals
// and Hotspot purchases, Safaricom callbacks, the pending-payment sweeper,
// C2B (manual Paybill) payments and the WISP's own subscription.
package billing

import (
	"context"
	"crypto/subtle"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/nabukob/lingarnew/wisp-saas/internal/mpesa"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/config"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/db"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/phone"
	"github.com/nabukob/lingarnew/wisp-saas/internal/sms"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
	"github.com/nabukob/lingarnew/wisp-saas/internal/tenant"
)

// Daraja is the subset of the M-Pesa client billing uses (faked in tests).
type Daraja interface {
	STKPush(ctx context.Context, cr mpesa.Credentials, r mpesa.STKRequest) (mpesa.STKResponse, error)
	STKQuery(ctx context.Context, cr mpesa.Credentials, checkoutID string) (mpesa.QueryResult, error)
	RegisterC2BURLs(ctx context.Context, cr mpesa.Credentials, confirmURL, validateURL string) error
}

type Service struct {
	DB      *db.DB
	Tenants *tenant.Service
	Daraja  Daraja
	Cfg     config.Config
	SMS     *sms.Service
	Now     func() time.Time
	// CallbackWait is how long a callback waits for its transaction row
	// (the STK request may still be committing). Default 3s.
	CallbackWait time.Duration
}

func (s *Service) now() time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

const (
	PurposeCustomer     = "customer"
	PurposeSubscription = "platform_subscription"
	PurposeSMSCredits   = "sms_credits"
)

// ─── Credentials ───────────────────────────────────────

func (s *Service) credentials(ctx context.Context, t store.Tenant, purpose string) (mpesa.Credentials, error) {
	if purpose != PurposeCustomer {
		if s.Cfg.MpesaConsumerKey == "" {
			return mpesa.Credentials{}, httpx.NewError(http.StatusServiceUnavailable, "MPESA_NOT_CONFIGURED",
				"Online payment to us isn't set up yet.", "Contact support to pay your subscription.")
		}
		return mpesa.Credentials{
			BaseURL: mpesa.BaseURL(s.Cfg.MpesaEnv), ConsumerKey: s.Cfg.MpesaConsumerKey, ConsumerSecret: s.Cfg.MpesaConsumerSecret,
			Passkey: s.Cfg.MpesaPasskey, BusinessShortCode: s.Cfg.MpesaShortcode, PartyB: s.Cfg.MpesaShortcode,
		}, nil
	}
	if t.MpesaShortcode == nil || *t.MpesaShortcode == "" {
		return mpesa.Credentials{}, httpx.Conflict("SHORTCODE_MISSING", "Add your Till or Paybill number first.", "Settings → M-Pesa.")
	}
	cr := mpesa.Credentials{BaseURL: mpesa.BaseURL(t.MpesaEnv), PartyB: *t.MpesaShortcode, BusinessShortCode: *t.MpesaShortcode, Till: t.MpesaShortcodeType == "till"}
	if cr.Till && t.MpesaStoreNumber != nil && *t.MpesaStoreNumber != "" {
		cr.BusinessShortCode = *t.MpesaStoreNumber
	}
	if t.MpesaMode == "own" {
		c, err := s.Tenants.OwnMpesaCredentials(ctx, t)
		if err != nil {
			return cr, httpx.Conflict("MPESA_CREDENTIALS_MISSING", "Your Daraja keys are missing.", "Settings → M-Pesa → add your keys, or switch to platform mode.")
		}
		cr.ConsumerKey, cr.ConsumerSecret, cr.Passkey = c.ConsumerKey, c.ConsumerSecret, c.Passkey
		return cr, nil
	}
	if s.Cfg.MpesaConsumerKey == "" {
		return cr, httpx.NewError(http.StatusServiceUnavailable, "MPESA_NOT_CONFIGURED",
			"M-Pesa isn't connected on this server yet.", "The platform needs MPESA_PLATFORM_CONSUMER_KEY/SECRET/PASSKEY.")
	}
	cr.ConsumerKey, cr.ConsumerSecret, cr.Passkey = s.Cfg.MpesaConsumerKey, s.Cfg.MpesaConsumerSecret, s.Cfg.MpesaPasskey
	return cr, nil
}

func (s *Service) callbackBase(t store.Tenant) string {
	return fmt.Sprintf("%s/v1/mpesa/%s/%s", s.Cfg.PublicAPIURL, t.Slug, t.CallbackToken)
}

func stkError(err error) error {
	var he *httpx.Error
	if errors.As(err, &he) {
		return err
	}
	var api *mpesa.APIError
	if errors.As(err, &api) {
		return httpx.NewError(http.StatusBadGateway, "MPESA_REJECTED", "M-Pesa didn't accept the payment request: "+api.Message,
			"Check the phone number and your Till/Paybill settings, then try again.")
	}
	return httpx.NewError(http.StatusBadGateway, "MPESA_UNREACHABLE", "We couldn't reach M-Pesa.", "Try again in a minute.")
}

func kes(cents int64) int64 { return int64(math.Ceil(float64(cents) / 100)) }

// ─── Starting payments ─────────────────────────────────

// ChargeSubscriber sends an STK Push for a PPPoE renewal. amountKES 0 means
// "plan price minus any credit".
func (s *Service) ChargeSubscriber(ctx context.Context, tenantID, subscriberID uuid.UUID, phoneOverride string, amountKES int64) (store.MpesaTransaction, error) {
	var t store.Tenant
	var sub store.Subscriber
	var price int64
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		var err error
		if t, err = q.GetTenant(ctx); err != nil {
			return err
		}
		if sub, err = q.GetSubscriber(ctx, subscriberID); err != nil {
			if db.IsNotFound(err) {
				return httpx.NotFound("That customer")
			}
			return err
		}
		if sub.PlanID != nil {
			if p, err := q.GetPlan(ctx, *sub.PlanID); err == nil {
				price = int64(p.PriceCents)
			}
		}
		return nil
	})
	if err != nil {
		return store.MpesaTransaction{}, err
	}
	if sub.Status == "cancelled" {
		return store.MpesaTransaction{}, httpx.Conflict("CANCELLED", "This customer was cancelled.", "")
	}
	msisdn := sub.PhoneNumber
	if phoneOverride != "" {
		p, ok := phone.Normalize(phoneOverride)
		if !ok {
			return store.MpesaTransaction{}, httpx.BadRequest("INVALID_PHONE", "That isn't a Safaricom number.", "Use a number like 0712 345 678.")
		}
		msisdn = p
	}
	cents := amountKES * 100
	if cents <= 0 {
		cents = price - int64(sub.CreditCents)
	}
	if cents < 100 {
		return store.MpesaTransaction{}, httpx.BadRequest("NOTHING_TO_PAY", "There's nothing to charge right now.", "Enter an amount to charge.")
	}
	return s.startSTK(ctx, t, PurposeCustomer, msisdn, cents, sub.PppoeUsername, "Internet", &sub.ID, nil)
}

func (s *Service) startSTK(ctx context.Context, t store.Tenant, purpose, msisdn string, cents int64, ref, desc string, subID, purchaseID *uuid.UUID) (store.MpesaTransaction, error) {
	cr, err := s.credentials(ctx, t, purpose)
	if err != nil {
		return store.MpesaTransaction{}, err
	}
	res, err := s.Daraja.STKPush(ctx, cr, mpesa.STKRequest{AmountKES: kes(cents), Phone: msisdn, CallbackURL: s.callbackBase(t) + "/stk", AccountReference: ref, Description: desc})
	if err != nil {
		slog.WarnContext(ctx, "stk push failed", "tenant_id", t.ID, "err", err)
		return store.MpesaTransaction{}, stkError(err)
	}
	var tx store.MpesaTransaction
	err = s.DB.WithTenant(ctx, t.ID, func(q *store.Queries) error {
		var err error
		tx, err = q.CreateSTKTransaction(ctx, store.CreateSTKTransactionParams{
			Purpose: purpose, MerchantRequestID: &res.MerchantRequestID, CheckoutRequestID: &res.CheckoutRequestID,
			PhoneNumber: &msisdn, AmountCents: int32(kes(cents) * 100), AccountReference: ref, TransactionDesc: &desc,
			SubscriberID: subID, HotspotPurchaseID: purchaseID,
		})
		return err
	})
	return tx, err
}

// PaySubscription charges the WISP for months of service (paid to us).
func (s *Service) PaySubscription(ctx context.Context, tenantID uuid.UUID, phoneNumber string, months int) (store.MpesaTransaction, error) {
	if months < 1 || months > 12 {
		return store.MpesaTransaction{}, httpx.BadRequest("INVALID_MONTHS", "Pay for 1 to 12 months.", "")
	}
	return s.payPlatform(ctx, tenantID, phoneNumber, PurposeSubscription, s.Cfg.SubscriptionPrice*int64(months), "Subscription")
}

// BuySMSCredits charges the WISP for SMS credits.
func (s *Service) BuySMSCredits(ctx context.Context, tenantID uuid.UUID, phoneNumber string, credits int) (store.MpesaTransaction, error) {
	if credits < 50 || credits > 100000 {
		return store.MpesaTransaction{}, httpx.BadRequest("INVALID_CREDITS", "Buy between 50 and 100,000 SMS credits.", "")
	}
	return s.payPlatform(ctx, tenantID, phoneNumber, PurposeSMSCredits, s.Cfg.SMSCreditPrice*int64(credits), "SMS credits")
}

func (s *Service) payPlatform(ctx context.Context, tenantID uuid.UUID, phoneNumber, purpose string, cents int64, desc string) (store.MpesaTransaction, error) {
	msisdn, ok := phone.Normalize(phoneNumber)
	if !ok {
		return store.MpesaTransaction{}, httpx.BadRequest("INVALID_PHONE", "That isn't a Safaricom number.", "Use a number like 0712 345 678.")
	}
	t, err := s.Tenants.Get(ctx, tenantID)
	if err != nil {
		return store.MpesaTransaction{}, err
	}
	return s.startSTK(ctx, t, purpose, msisdn, cents, t.AccountPrefix, desc, nil, nil)
}

// ─── Callbacks ─────────────────────────────────────────

// ClientIP returns the caller's IP, honouring proxy headers only when configured.
func (s *Service) ClientIP(r *http.Request) string {
	if s.Cfg.TrustProxyHeaders {
		if v := r.Header.Get("CF-Connecting-IP"); v != "" {
			return strings.TrimSpace(v)
		}
		if v := r.Header.Get("X-Forwarded-For"); v != "" {
			return strings.TrimSpace(strings.Split(v, ",")[0])
		}
	}
	host := r.RemoteAddr
	if i := strings.LastIndex(host, ":"); i > 0 {
		host = host[:i]
	}
	return strings.Trim(host, "[]")
}

// authorizeCallback checks the source IP and the per-tenant token in the URL.
func (s *Service) authorizeCallback(ctx context.Context, slug, token, ip string) (uuid.UUID, error) {
	if !ipAllowed(s.Cfg.MpesaAllowedIPs, ip) {
		slog.WarnContext(ctx, "mpesa callback from unlisted IP", "ip", ip, "slug", slug)
		return uuid.Nil, errForbidden
	}
	var row store.TenantBySlugRow
	err := s.DB.WithoutTenant(ctx, func(q *store.Queries) error {
		var err error
		row, err = q.TenantBySlug(ctx, slug)
		return err
	})
	if err != nil || subtle.ConstantTimeCompare([]byte(row.CallbackToken), []byte(token)) != 1 {
		slog.WarnContext(ctx, "mpesa callback with bad slug/token", "ip", ip, "slug", slug)
		return uuid.Nil, errForbidden
	}
	return row.TenantID, nil
}

var errForbidden = httpx.NewError(http.StatusForbidden, "FORBIDDEN", "Not allowed.", "")

// followUp runs after the database commit (SMS, etc.).
type followUp func(ctx context.Context)

// HandleSTKCallback applies Safaricom's STK result. It is idempotent.
func (s *Service) HandleSTKCallback(ctx context.Context, tenantID uuid.UUID, cb mpesa.STKCallback) error {
	checkout := cb.Body.StkCallback.CheckoutRequestID
	code := cb.Body.StkCallback.ResultCode
	amountKES, receipt, _ := cb.Metadata()
	wait := s.CallbackWait
	if wait == 0 {
		wait = 3 * time.Second
	}
	deadline := time.Now().Add(wait)
	for {
		var after []followUp
		found := true
		err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
			tx, err := q.GetTxByCheckoutForUpdate(ctx, &checkout)
			if db.IsNotFound(err) {
				found = false
				return nil
			}
			if err != nil {
				return err
			}
			after, err = s.settle(ctx, q, tx, code, cb.Body.StkCallback.ResultDesc, int64(amountKES*100+0.5), receipt)
			return err
		})
		if err != nil {
			return err
		}
		if found {
			for _, f := range after {
				f(ctx)
			}
			return nil
		}
		if time.Now().After(deadline) {
			slog.WarnContext(ctx, "stk callback for unknown checkout; the sweeper will reconcile it", "tenant_id", tenantID, "checkout", checkout)
			return nil
		}
		time.Sleep(250 * time.Millisecond)
	}
}

// settle records an outcome for a transaction (locked FOR UPDATE by the caller).
func (s *Service) settle(ctx context.Context, q *store.Queries, tx store.MpesaTransaction, code int, desc string, amountCents int64, receipt string) ([]followUp, error) {
	var rcpt *string
	if receipt != "" {
		if exists, err := q.TxReceiptExists(ctx, &receipt); err != nil {
			return nil, err
		} else if !exists || (tx.MpesaReceiptNumber != nil && *tx.MpesaReceiptNumber == receipt) {
			rcpt = &receipt
		}
	}
	if tx.Status != "pending" {
		// Already final (duplicate callback, or the sweeper got there first). Fill in a missing receipt only.
		if tx.Status == "success" && tx.MpesaReceiptNumber == nil && rcpt != nil {
			if err := q.CompleteTx(ctx, store.CompleteTxParams{ID: tx.ID, Status: "success", ResultCode: tx.ResultCode, ResultDesc: tx.ResultDesc, MpesaReceiptNumber: rcpt}); err != nil {
				return nil, err
			}
			if tx.HotspotPurchaseID != nil {
				p, err := q.GetPurchase(ctx, *tx.HotspotPurchaseID)
				if err == nil {
					_, err = q.ActivatePurchase(ctx, store.ActivatePurchaseParams{ID: p.ID, StartsAt: p.StartsAt, ExpiresAt: p.ExpiresAt, MpesaReceiptNumber: rcpt})
				}
				return nil, err
			}
		}
		return nil, nil
	}
	status := mpesa.StatusForResult(code)
	c32 := int32(code)
	var amt *int32
	if status == "success" && amountCents > 0 {
		a := int32(amountCents)
		amt = &a
	} else {
		amountCents = int64(tx.AmountCents)
	}
	if err := q.CompleteTx(ctx, store.CompleteTxParams{ID: tx.ID, Status: status, ResultCode: &c32, ResultDesc: &desc, MpesaReceiptNumber: rcpt, AmountCents: amt}); err != nil {
		return nil, err
	}
	if status != "success" {
		return nil, nil
	}
	return s.apply(ctx, q, tx, amountCents, rcpt)
}

// apply credits a successful payment to what it was for.
func (s *Service) apply(ctx context.Context, q *store.Queries, tx store.MpesaTransaction, amountCents int64, receipt *string) ([]followUp, error) {
	switch {
	case tx.Purpose == PurposeSubscription:
		t, err := q.GetTenant(ctx)
		if err != nil {
			return nil, err
		}
		months := amountCents / s.Cfg.SubscriptionPrice
		if months < 1 {
			months = 1
		}
		base := s.now()
		if t.SubscriptionExpiresAt != nil && t.SubscriptionExpiresAt.After(base) {
			base = *t.SubscriptionExpiresAt
		} else if t.SubscriptionStatus == "trial" && t.TrialEndsAt.After(base) {
			base = t.TrialEndsAt
		}
		exp := base.AddDate(0, int(months), 0)
		return nil, q.SetSubscription(ctx, store.SetSubscriptionParams{SubscriptionStatus: "active", SubscriptionExpiresAt: &exp})
	case tx.Purpose == PurposeSMSCredits:
		_, err := q.AddSMSCredits(ctx, int32(amountCents/s.Cfg.SMSCreditPrice))
		return nil, err
	case tx.HotspotPurchaseID != nil:
		p, err := q.GetPurchase(ctx, *tx.HotspotPurchaseID)
		if err != nil {
			return nil, err
		}
		plan, err := q.GetPlan(ctx, p.PlanID)
		if err != nil {
			return nil, err
		}
		start := s.now()
		end := start.Add(time.Duration(*plan.DurationMinutes) * time.Minute)
		_, err = q.ActivatePurchase(ctx, store.ActivatePurchaseParams{ID: p.ID, StartsAt: &start, ExpiresAt: &end, MpesaReceiptNumber: receipt})
		return nil, err
	case tx.SubscriberID != nil:
		return s.applyToSubscriber(ctx, q, *tx.SubscriberID, amountCents, receipt)
	}
	return nil, nil
}

// applyToSubscriber adds money to a PPPoE account, renewing whole periods and
// keeping the rest as credit.
func (s *Service) applyToSubscriber(ctx context.Context, q *store.Queries, subID uuid.UUID, amountCents int64, receipt *string) ([]followUp, error) {
	sub, err := q.GetSubscriberForUpdate(ctx, subID)
	if err != nil {
		return nil, err
	}
	t, err := q.GetTenant(ctx)
	if err != nil {
		return nil, err
	}
	total := int64(sub.CreditCents) + amountCents
	var price int64
	var days int32
	if sub.PlanID != nil {
		if p, err := q.GetPlan(ctx, *sub.PlanID); err == nil && p.DurationDays != nil {
			price, days = int64(p.PriceCents), *p.DurationDays
		}
	}
	next, status, credit := sub.NextRenewalAt, sub.Status, total
	renewed := false
	if sub.Status != "cancelled" && price > 0 && total >= price {
		periods := total / price
		credit = total % price
		base := s.now()
		if sub.NextRenewalAt != nil && sub.NextRenewalAt.After(base) {
			base = *sub.NextRenewalAt
		}
		n := base.Add(time.Duration(periods) * time.Duration(days) * 24 * time.Hour)
		next, status, renewed = &n, "active", true
	}
	if _, err := q.ApplySubscriberPayment(ctx, store.ApplySubscriberPaymentParams{ID: sub.ID, NextRenewalAt: next, CreditCents: int32(credit), Status: status}); err != nil {
		return nil, err
	}
	if s.SMS == nil {
		return nil, nil
	}
	loc, _ := time.LoadLocation(t.Timezone)
	if loc == nil {
		loc = time.UTC
	}
	var body string
	r := ""
	if receipt != nil {
		r = " (" + *receipt + ")"
	}
	if renewed {
		body = fmt.Sprintf("Payment received: KSh %s%s. %s is paid until %s. Thank you - %s",
			commas(amountCents/100), r, sub.PppoeUsername, next.In(loc).Format("2 Jan 2006"), t.Name)
	} else {
		body = fmt.Sprintf("Received KSh %s%s for %s. Pay KSh %s more to renew. - %s",
			commas(amountCents/100), r, sub.PppoeUsername, commas((price-credit+99)/100), t.Name)
	}
	to, tenantID := sub.PhoneNumber, t.ID
	return []followUp{func(ctx context.Context) { _, _ = s.SMS.Send(ctx, tenantID, to, body, "receipt") }}, nil
}

func commas(n int64) string {
	s := fmt.Sprintf("%d", n)
	var b strings.Builder
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteByte(',')
		}
		b.WriteRune(c)
	}
	return b.String()
}

// ─── Sweeper ───────────────────────────────────────────

// SweepPending resolves STK payments with no callback yet: after 60s it asks
// Safaricom; after 5 minutes without an answer the payment is marked expired.
func (s *Service) SweepPending(ctx context.Context) error {
	var tenants []uuid.UUID
	if err := s.DB.WithoutTenant(ctx, func(q *store.Queries) error {
		var err error
		tenants, err = q.ActiveTenantIDs(ctx)
		return err
	}); err != nil {
		return err
	}
	for _, tid := range tenants {
		var pending []store.MpesaTransaction
		var t store.Tenant
		_ = s.DB.WithTenant(ctx, tid, func(q *store.Queries) error {
			var err error
			if t, err = q.GetTenant(ctx); err != nil {
				return err
			}
			pending, err = q.ListPendingTx(ctx, s.now().Add(-60*time.Second))
			return err
		})
		for _, tx := range pending {
			if err := s.reconcile(ctx, t, tx); err != nil {
				slog.WarnContext(ctx, "reconcile pending payment", "tenant_id", tid, "tx", tx.ID, "err", err)
			}
		}
	}
	return nil
}

func (s *Service) reconcile(ctx context.Context, t store.Tenant, tx store.MpesaTransaction) error {
	if tx.CheckoutRequestID == nil {
		return nil
	}
	cr, err := s.credentials(ctx, t, tx.Purpose)
	if err != nil {
		return err
	}
	res, qerr := s.Daraja.STKQuery(ctx, cr, *tx.CheckoutRequestID)
	stale := s.now().Sub(tx.CreatedAt) > 5*time.Minute
	if qerr != nil && !stale {
		return qerr
	}
	var after []followUp
	err = s.DB.WithTenant(ctx, t.ID, func(q *store.Queries) error {
		locked, err := q.GetTxByCheckoutForUpdate(ctx, tx.CheckoutRequestID)
		if err != nil || locked.Status != "pending" {
			return err
		}
		switch {
		case qerr == nil && !res.Pending:
			after, err = s.settle(ctx, q, locked, res.ResultCode, res.ResultDesc, int64(locked.AmountCents), "")
			return err
		case stale:
			code := int32(1037)
			desc := "No answer from M-Pesa within 5 minutes"
			return q.CompleteTx(ctx, store.CompleteTxParams{ID: locked.ID, Status: "expired", ResultCode: &code, ResultDesc: &desc})
		}
		return nil
	})
	for _, f := range after {
		f(ctx)
	}
	return err
}

// ─── C2B (manual Paybill payments) ─────────────────────

// HandleC2BConfirmation records a manual payment and applies it when the
// account number matches a customer; otherwise it waits in the unmatched queue.
func (s *Service) HandleC2BConfirmation(ctx context.Context, tenantID uuid.UUID, c mpesa.C2BConfirmation) error {
	ref := strings.ToUpper(strings.NewReplacer(" ", "", "-", "", ".", "").Replace(c.BillRefNumber))
	cents := c.AmountCents()
	var after []followUp
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		if exists, err := q.TxReceiptExists(ctx, &c.TransID); err != nil || exists {
			return err
		}
		var subID *uuid.UUID
		status := "unmatched"
		if ref != "" {
			if sub, err := q.GetSubscriberByUsername(ctx, ref); err == nil {
				subID, status = &sub.ID, "success"
			} else if !db.IsNotFound(err) {
				return err
			}
		}
		var ph *string
		if p, ok := phone.Normalize(c.MSISDN); ok {
			ph = &p
		}
		accountRef := strings.TrimSpace(c.BillRefNumber)
		if accountRef == "" {
			accountRef = "(none)"
		}
		tx, err := q.CreateC2BTransaction(ctx, store.CreateC2BTransactionParams{
			MpesaReceiptNumber: &c.TransID, PhoneNumber: ph, AmountCents: int32(cents), AccountReference: accountRef, Status: status, SubscriberID: subID,
		})
		if err != nil {
			return err
		}
		if subID != nil {
			after, err = s.applyToSubscriber(ctx, q, *subID, cents, &c.TransID)
			_ = tx
		}
		return err
	})
	for _, f := range after {
		f(ctx)
	}
	return err
}

// MatchPayment assigns an unmatched C2B payment to a customer and applies it.
func (s *Service) MatchPayment(ctx context.Context, tenantID, txID, subscriberID uuid.UUID) error {
	var after []followUp
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		tx, err := q.GetTx(ctx, txID)
		if db.IsNotFound(err) {
			return httpx.NotFound("That payment")
		}
		if err != nil {
			return err
		}
		if tx.Status != "unmatched" {
			return httpx.Conflict("ALREADY_MATCHED", "That payment is already assigned.", "")
		}
		if _, err := q.GetSubscriber(ctx, subscriberID); err != nil {
			return httpx.NotFound("That customer")
		}
		if err := q.MatchTx(ctx, store.MatchTxParams{ID: txID, SubscriberID: &subscriberID}); err != nil {
			return err
		}
		after, err = s.applyToSubscriber(ctx, q, subscriberID, int64(tx.AmountCents), tx.MpesaReceiptNumber)
		return err
	})
	for _, f := range after {
		f(ctx)
	}
	return err
}

// RegisterC2B registers our confirmation/validation URLs for the tenant's shortcode.
func (s *Service) RegisterC2B(ctx context.Context, tenantID uuid.UUID) error {
	t, err := s.Tenants.Get(ctx, tenantID)
	if err != nil {
		return err
	}
	cr, err := s.credentials(ctx, t, PurposeCustomer)
	if err != nil {
		return err
	}
	base := s.callbackBase(t)
	if err := s.Daraja.RegisterC2BURLs(ctx, cr, base+"/c2b/confirm", base+"/c2b/validate"); err != nil {
		return stkError(err)
	}
	return nil
}
