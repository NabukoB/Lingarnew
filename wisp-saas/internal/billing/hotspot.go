package billing

import (
	"context"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/nabukob/lingarnew/wisp-saas/internal/mpesa"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/db"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/phone"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
)

var macRe = regexp.MustCompile(`^([0-9A-F]{2}:){5}[0-9A-F]{2}$`)

// NormalizeMAC returns AA:BB:CC:DD:EE:FF or "" when invalid.
func NormalizeMAC(s string) string {
	s = strings.ToUpper(strings.NewReplacer("-", ":", ".", "").Replace(strings.TrimSpace(s)))
	if len(s) == 12 && !strings.Contains(s, ":") {
		var b strings.Builder
		for i := 0; i < 12; i += 2 {
			if i > 0 {
				b.WriteByte(':')
			}
			b.WriteString(s[i : i+2])
		}
		s = b.String()
	}
	if !macRe.MatchString(s) {
		return ""
	}
	return s
}

func deviceMissing() error {
	return httpx.BadRequest("DEVICE_UNKNOWN", "We couldn't identify your device.", "Forget the Wi-Fi network, reconnect, and open the page again.")
}

// BuyHotspot creates a pending purchase for one device and sends the STK Push.
func (s *Service) BuyHotspot(ctx context.Context, tenantID, planID uuid.UUID, phoneNumber, mac string, routerID *uuid.UUID) (store.HotspotPurchase, error) {
	mac = NormalizeMAC(mac)
	if mac == "" {
		return store.HotspotPurchase{}, deviceMissing()
	}
	msisdn, ok := phone.Normalize(phoneNumber)
	if !ok {
		return store.HotspotPurchase{}, httpx.BadRequest("INVALID_PHONE", "Enter a Safaricom number.", "e.g. 0712 345 678")
	}
	var t store.Tenant
	var plan store.Plan
	var p store.HotspotPurchase
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		var err error
		if t, err = q.GetTenant(ctx); err != nil {
			return err
		}
		plan, err = q.GetPlan(ctx, planID)
		if err != nil || plan.AccessType != "hotspot" || !plan.IsActive || plan.IsTrial {
			return httpx.BadRequest("INVALID_PACKAGE", "That package isn't available.", "Pick another package.")
		}
		p, err = q.CreatePurchase(ctx, store.CreatePurchaseParams{RouterID: routerID, PlanID: planID, Source: "mpesa", PhoneNumber: &msisdn, Macs: []string{mac}, MaxDevices: plan.MaxDevices})
		return err
	})
	if err != nil {
		return p, err
	}
	ref := "HS" + strings.ToUpper(strings.ReplaceAll(p.ID.String(), "-", "")[:8])
	if _, err := s.startSTK(ctx, t, PurposeCustomer, msisdn, int64(plan.PriceCents), ref, plan.Name, nil, &p.ID); err != nil {
		return p, err
	}
	return p, nil
}

// PurchaseState is what the portal shows while waiting for payment.
type PurchaseState struct {
	ID         uuid.UUID  `json:"id"`
	State      string     `json:"state"` // pending | active | failed | expired
	Message    string     `json:"message"`
	PlanName   string     `json:"plan_name"`
	PriceKES   int32      `json:"price_kes"`
	Phone      string     `json:"phone"`
	Receipt    *string    `json:"receipt"`
	ExpiresAt  *time.Time `json:"expires_at"`
	Devices    int        `json:"devices"`
	MaxDevices int32      `json:"max_devices"`
	Mbps       int32      `json:"mbps"`
	// Credentials the portal submits to the router's hotspot login.
	LoginUser string `json:"login_username,omitempty"`
}

// PurchaseStatus reports a purchase. If the payment is still pending after
// 15s it asks Safaricom directly, so a lost callback doesn't strand the customer.
func (s *Service) PurchaseStatus(ctx context.Context, tenantID, purchaseID uuid.UUID, mac string) (PurchaseState, error) {
	read := func() (store.HotspotPurchase, store.Plan, *store.MpesaTransaction, store.Tenant, error) {
		var p store.HotspotPurchase
		var plan store.Plan
		var tx *store.MpesaTransaction
		var t store.Tenant
		err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
			var err error
			if p, err = q.GetPurchase(ctx, purchaseID); err != nil {
				if db.IsNotFound(err) {
					return httpx.NotFound("That purchase")
				}
				return err
			}
			if t, err = q.GetTenant(ctx); err != nil {
				return err
			}
			if plan, err = q.GetPlan(ctx, p.PlanID); err != nil {
				return err
			}
			if x, err := q.LatestTxForPurchase(ctx, &p.ID); err == nil {
				tx = &x
			} else if !db.IsNotFound(err) {
				return err
			}
			return nil
		})
		return p, plan, tx, t, err
	}
	p, plan, tx, t, err := read()
	if err != nil {
		return PurchaseState{}, err
	}
	if tx != nil && tx.Status == "pending" && s.now().Sub(tx.CreatedAt) > 15*time.Second {
		_ = s.reconcile(ctx, t, *tx)
		if p, plan, tx, _, err = read(); err != nil {
			return PurchaseState{}, err
		}
	}
	mac = NormalizeMAC(mac)
	st := PurchaseState{ID: p.ID, PlanName: plan.Name, PriceKES: plan.PriceCents / 100, Receipt: p.MpesaReceiptNumber, ExpiresAt: p.ExpiresAt,
		Devices: len(p.Macs), MaxDevices: p.MaxDevices, Mbps: plan.BandwidthDownKbps / 1000}
	if p.PhoneNumber != nil {
		st.Phone = phone.Pretty(*p.PhoneNumber)
	}
	switch {
	case p.StartsAt != nil && p.ExpiresAt != nil && p.ExpiresAt.After(s.now()):
		st.State, st.Message = "active", mpesa.UserMessage(0)
		if mac != "" && contains(p.Macs, mac) {
			st.LoginUser = mac
		}
	case p.StartsAt != nil:
		st.State, st.Message = "expired", "This package has ended. Buy another to reconnect."
	case tx != nil && tx.Status != "pending" && tx.Status != "success":
		code := 1
		if tx.ResultCode != nil {
			code = int(*tx.ResultCode)
		}
		st.State, st.Message = "failed", mpesa.UserMessage(code)
	default:
		st.State, st.Message = "pending", "Enter your M-Pesa PIN on your phone."
	}
	return st, nil
}

func contains(xs []string, x string) bool {
	for _, v := range xs {
		if v == x {
			return true
		}
	}
	return false
}

// Reconnect adds this device to an active purchase identified by its M-Pesa code.
func (s *Service) Reconnect(ctx context.Context, tenantID uuid.UUID, receipt, mac string) (store.HotspotPurchase, error) {
	mac = NormalizeMAC(mac)
	if mac == "" {
		return store.HotspotPurchase{}, deviceMissing()
	}
	receipt = strings.ToUpper(strings.TrimSpace(receipt))
	if !regexp.MustCompile(`^[A-Z0-9]{10}$`).MatchString(receipt) {
		return store.HotspotPurchase{}, httpx.BadRequest("INVALID_CODE", "Check the code and try again.", "It's the 10-character code at the start of your M-Pesa SMS.")
	}
	var p store.HotspotPurchase
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		var err error
		p, err = q.PurchaseByReceiptForUpdate(ctx, receipt)
		if db.IsNotFound(err) {
			return httpx.NewError(http.StatusNotFound, "CODE_NOT_FOUND", "We can't find that M-Pesa code.", "Check it matches your SMS. If you just paid, wait a minute and try again.")
		}
		if err != nil {
			return err
		}
		if p.ExpiresAt == nil || !p.ExpiresAt.After(s.now()) {
			return httpx.Conflict("PACKAGE_ENDED", "That package has ended.", "Buy a new package to get back online.")
		}
		if contains(p.Macs, mac) {
			return nil
		}
		updated, err := q.AddPurchaseMAC(ctx, store.AddPurchaseMACParams{ID: p.ID, Mac: mac})
		if db.IsNotFound(err) {
			return httpx.Conflict("DEVICE_LIMIT", "Used on "+itoa(len(p.Macs))+" of "+itoa(int(p.MaxDevices))+" devices.", "Buy a new package for this device.")
		}
		p = updated
		return err
	})
	return p, err
}

func itoa(n int) string { return strconv.Itoa(n) }

// RedeemVoucher starts a voucher's package on this device.
func (s *Service) RedeemVoucher(ctx context.Context, tenantID uuid.UUID, code, mac string, routerID *uuid.UUID) (store.HotspotPurchase, error) {
	mac = NormalizeMAC(mac)
	if mac == "" {
		return store.HotspotPurchase{}, deviceMissing()
	}
	code = strings.ToUpper(strings.TrimSpace(code))
	var p store.HotspotPurchase
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		v, err := q.GetVoucherByCodeForUpdate(ctx, code)
		if db.IsNotFound(err) {
			return httpx.NewError(http.StatusNotFound, "VOUCHER_NOT_FOUND", "Check the code and try again.", "Vouchers are 8 letters and numbers.")
		}
		if err != nil {
			return err
		}
		if v.RedeemedAt != nil {
			return httpx.Conflict("VOUCHER_USED", "This voucher was already used.", "")
		}
		plan, err := q.GetPlan(ctx, v.PlanID)
		if err != nil {
			return err
		}
		if err := q.RedeemVoucher(ctx, store.RedeemVoucherParams{ID: v.ID, RedeemedMac: &mac}); err != nil {
			return err
		}
		start := s.now()
		end := start.Add(time.Duration(*plan.DurationMinutes) * time.Minute)
		p, err = q.CreatePurchase(ctx, store.CreatePurchaseParams{RouterID: routerID, PlanID: plan.ID, Source: "voucher", VoucherID: &v.ID,
			Macs: []string{mac}, MaxDevices: plan.MaxDevices, StartsAt: &start, ExpiresAt: &end})
		return err
	})
	return p, err
}

// StartTrial gives a device the tenant's free trial, once per 24 hours.
func (s *Service) StartTrial(ctx context.Context, tenantID uuid.UUID, mac string, routerID *uuid.UUID) (store.HotspotPurchase, error) {
	mac = NormalizeMAC(mac)
	if mac == "" {
		return store.HotspotPurchase{}, deviceMissing()
	}
	var p store.HotspotPurchase
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		plans, err := q.ListActiveHotspotPlans(ctx)
		if err != nil {
			return err
		}
		var trial *store.Plan
		for i := range plans {
			if plans[i].IsTrial {
				trial = &plans[i]
				break
			}
		}
		if trial == nil {
			return httpx.NewError(http.StatusNotFound, "NO_TRIAL", "There's no free trial here.", "Buy a package instead.")
		}
		used, err := q.TrialUsedSince(ctx, store.TrialUsedSinceParams{Mac: mac, Since: s.now().Add(-24 * time.Hour)})
		if err != nil {
			return err
		}
		if used {
			return httpx.Conflict("TRIAL_USED", "You've had today's free trial.", "Buy a package to keep browsing.")
		}
		start := s.now()
		end := start.Add(time.Duration(*trial.DurationMinutes) * time.Minute)
		p, err = q.CreatePurchase(ctx, store.CreatePurchaseParams{RouterID: routerID, PlanID: trial.ID, Source: "trial",
			Macs: []string{mac}, MaxDevices: 1, StartsAt: &start, ExpiresAt: &end})
		return err
	})
	return p, err
}
