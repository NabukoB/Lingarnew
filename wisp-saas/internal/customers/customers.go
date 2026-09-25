// Package customers manages PPPoE subscribers, plans (PPPoE + Hotspot
// packages), locations and Hotspot vouchers.
package customers

import (
	"context"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/db"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/phone"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/random"
	"github.com/nabukob/lingarnew/wisp-saas/internal/secrets"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
	"github.com/nabukob/lingarnew/wisp-saas/internal/tenant"
)

// Disconnector kicks a user's live sessions off their router (RADIUS CoA, REST fallback).
type Disconnector interface {
	Disconnect(ctx context.Context, tenantID uuid.UUID, username string, reason string) error
}

type Service struct {
	DB           *db.DB
	Sealer       *secrets.Sealer
	Disconnector Disconnector
	Now          func() time.Time
}

func (s *Service) now() time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

func bad(code, msg, hint string) error { return httpx.BadRequest(code, msg, hint) }

func strPtr(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}

// ─── Plans ──────────────────────────────────────────────

type PlanInput struct {
	Name              string     `json:"name"`
	AccessType        string     `json:"access_type"`
	PriceKES          int32      `json:"price_kes"`
	DurationDays      *int32     `json:"duration_days"`
	DurationMinutes   *int32     `json:"duration_minutes"`
	IsTrial           bool       `json:"is_trial"`
	DataCapMB         *int64     `json:"data_cap_mb"`
	BandwidthDownKbps int32      `json:"bandwidth_down_kbps"`
	BandwidthUpKbps   int32      `json:"bandwidth_up_kbps"`
	MaxDevices        int32      `json:"max_devices"`
	LocationID        *uuid.UUID `json:"location_id"`
	IsActive          *bool      `json:"is_active"`
	SortOrder         int32      `json:"sort_order"`
}

func (in *PlanInput) validate(creating bool) error {
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" || len(in.Name) > 40 {
		return bad("INVALID_PLAN_NAME", "Give the package a name (up to 40 characters).", "")
	}
	if creating && in.AccessType != "pppoe" && in.AccessType != "hotspot" {
		return bad("INVALID_ACCESS_TYPE", "Choose PPPoE or Hotspot.", "")
	}
	if in.PriceKES < 0 || (in.PriceKES == 0 && !in.IsTrial) {
		return bad("INVALID_PRICE", "Set a price in KES.", "Only a free trial can cost 0.")
	}
	if in.AccessType == "pppoe" && (in.DurationDays == nil || *in.DurationDays < 1) {
		return bad("INVALID_DURATION", "PPPoE plans need a length in days.", "Use 30 for monthly.")
	}
	if in.AccessType == "hotspot" && (in.DurationMinutes == nil || *in.DurationMinutes < 1) {
		return bad("INVALID_DURATION", "Hotspot packages need a length in minutes.", "e.g. 30, 180, 1440.")
	}
	if in.BandwidthDownKbps < 64 || in.BandwidthUpKbps < 64 {
		return bad("INVALID_SPEED", "Set download and upload speeds.", "At least 64 kbps each.")
	}
	if in.MaxDevices == 0 {
		in.MaxDevices = 1
	}
	if in.MaxDevices < 1 || in.MaxDevices > 20 {
		return bad("INVALID_DEVICES", "Devices per purchase must be 1–20.", "")
	}
	return nil
}

func (s *Service) ListPlans(ctx context.Context, tenantID uuid.UUID, accessType string) ([]store.Plan, error) {
	var out []store.Plan
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		var err error
		out, err = q.ListPlans(ctx, strPtr(accessType))
		return err
	})
	return out, err
}

func (s *Service) CreatePlan(ctx context.Context, tenantID uuid.UUID, in PlanInput) (store.Plan, error) {
	if err := in.validate(true); err != nil {
		return store.Plan{}, err
	}
	var p store.Plan
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		var err error
		profile := tenant.ProfileName(in.Name)
		p, err = q.CreatePlan(ctx, store.CreatePlanParams{
			LocationID: in.LocationID, Name: in.Name, AccessType: in.AccessType, PriceCents: in.PriceKES * 100,
			DurationDays: in.DurationDays, DurationMinutes: in.DurationMinutes, IsTrial: in.IsTrial, DataCapMb: in.DataCapMB,
			BandwidthDownKbps: in.BandwidthDownKbps, BandwidthUpKbps: in.BandwidthUpKbps, MaxDevices: in.MaxDevices,
			MikrotikProfileName: &profile, SortOrder: in.SortOrder,
		})
		return err
	})
	return p, err
}

func (s *Service) UpdatePlan(ctx context.Context, tenantID, id uuid.UUID, in PlanInput) (store.Plan, error) {
	var p store.Plan
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		cur, err := q.GetPlan(ctx, id)
		if db.IsNotFound(err) {
			return httpx.NotFound("That package")
		}
		if err != nil {
			return err
		}
		in.AccessType = cur.AccessType
		if err := in.validate(false); err != nil {
			return err
		}
		active := cur.IsActive
		if in.IsActive != nil {
			active = *in.IsActive
		}
		p, err = q.UpdatePlan(ctx, store.UpdatePlanParams{
			ID: id, Name: in.Name, PriceCents: in.PriceKES * 100, DurationDays: in.DurationDays, DurationMinutes: in.DurationMinutes,
			DataCapMb: in.DataCapMB, BandwidthDownKbps: in.BandwidthDownKbps, BandwidthUpKbps: in.BandwidthUpKbps,
			MaxDevices: in.MaxDevices, IsActive: active, SortOrder: in.SortOrder,
		})
		return err
	})
	return p, err
}

// ─── Locations ──────────────────────────────────────────

func (s *Service) ListLocations(ctx context.Context, tenantID uuid.UUID) ([]store.Location, error) {
	var out []store.Location
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		var err error
		out, err = q.ListLocations(ctx)
		return err
	})
	return out, err
}

func (s *Service) CreateLocation(ctx context.Context, tenantID uuid.UUID, name, address string) (store.Location, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return store.Location{}, bad("INVALID_LOCATION", "Name the site, e.g. Kasarani POP.", "")
	}
	var l store.Location
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		var err error
		l, err = q.CreateLocation(ctx, store.CreateLocationParams{Name: name, Address: strPtr(address)})
		return err
	})
	return l, err
}

// ─── Subscribers ────────────────────────────────────────

type SubscriberInput struct {
	FullName        string     `json:"full_name"`
	Phone           string     `json:"phone"`
	Email           string     `json:"email"`
	PhysicalAddress string     `json:"physical_address"`
	PlanID          *uuid.UUID `json:"plan_id"`
	LocationID      *uuid.UUID `json:"location_id"`
	AutoRenew       *bool      `json:"auto_renew"`
	// Create only: when true the first period starts now (already paid in cash).
	StartNow bool   `json:"start_now"`
	Password string `json:"password"`
}

func (in *SubscriberInput) validate() error {
	in.FullName = strings.TrimSpace(in.FullName)
	if len(in.FullName) < 2 {
		return bad("INVALID_NAME", "Enter the customer's name.", "")
	}
	p, ok := phone.Normalize(in.Phone)
	if !ok {
		return bad("INVALID_PHONE", "That isn't a Kenyan mobile number.", "Use a number like 0712 345 678; it's where M-Pesa prompts and reminders go.")
	}
	in.Phone = p
	if e := strings.TrimSpace(in.Email); e != "" {
		if _, err := mail.ParseAddress(e); err != nil {
			return bad("INVALID_EMAIL", "That email address doesn't look right.", "")
		}
	}
	if in.Password != "" && (len(in.Password) < 6 || len(in.Password) > 32) {
		return bad("INVALID_PASSWORD", "PPPoE passwords must be 6–32 characters.", "Leave it blank to generate one.")
	}
	return nil
}

func passwordField(id uuid.UUID) secrets.Field {
	return secrets.Field{Table: "subscribers", Column: "pppoe_password_enc", RowID: id}
}

// CreateSubscriber assigns the next account ID (e.g. JZM1042) and a PPPoE password.
// The plain password is returned once so the WISP can configure the customer's router.
func (s *Service) CreateSubscriber(ctx context.Context, tenantID uuid.UUID, in SubscriberInput) (store.Subscriber, string, error) {
	if err := in.validate(); err != nil {
		return store.Subscriber{}, "", err
	}
	if in.PlanID == nil {
		return store.Subscriber{}, "", bad("PLAN_REQUIRED", "Choose a plan for this customer.", "")
	}
	password := in.Password
	if password == "" {
		password = random.Password(10)
	}
	id := uuid.New()
	var sub store.Subscriber
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		t, err := q.GetTenant(ctx)
		if err != nil {
			return err
		}
		plan, err := q.GetPlan(ctx, *in.PlanID)
		if db.IsNotFound(err) || (err == nil && plan.AccessType != "pppoe") {
			return bad("INVALID_PLAN", "Choose one of your PPPoE plans.", "")
		}
		if err != nil {
			return err
		}
		acct, err := q.NextAccountNumber(ctx)
		if err != nil {
			return err
		}
		sealed, err := s.Sealer.Seal(ctx, tenantID, t.DekWrapped, passwordField(id), []byte(password))
		if err != nil {
			return err
		}
		status, renew := "expired", s.now()
		if in.StartNow {
			status, renew = "active", s.now().Add(time.Duration(*plan.DurationDays)*24*time.Hour)
		}
		sub, err = q.CreateSubscriber(ctx, store.CreateSubscriberParams{
			ID: id, LocationID: in.LocationID, FullName: in.FullName, PhoneNumber: in.Phone,
			Email: strPtr(in.Email), PhysicalAddress: strPtr(in.PhysicalAddress),
			PppoeUsername:    fmt.Sprintf("%s%d", acct.AccountPrefix, acct.AccountNo),
			PppoePasswordEnc: sealed, PlanID: in.PlanID, NextRenewalAt: &renew, Status: status,
		})
		return err
	})
	return sub, password, err
}

func (s *Service) UpdateSubscriber(ctx context.Context, tenantID, id uuid.UUID, in SubscriberInput) (store.Subscriber, error) {
	if err := in.validate(); err != nil {
		return store.Subscriber{}, err
	}
	var sub store.Subscriber
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		cur, err := q.GetSubscriber(ctx, id)
		if db.IsNotFound(err) {
			return httpx.NotFound("That customer")
		}
		if err != nil {
			return err
		}
		if in.PlanID != nil {
			plan, err := q.GetPlan(ctx, *in.PlanID)
			if err != nil || plan.AccessType != "pppoe" {
				return bad("INVALID_PLAN", "Choose one of your PPPoE plans.", "")
			}
		} else {
			in.PlanID = cur.PlanID
		}
		auto := cur.AutoRenew
		if in.AutoRenew != nil {
			auto = *in.AutoRenew
		}
		sub, err = q.UpdateSubscriber(ctx, store.UpdateSubscriberParams{
			ID: id, FullName: in.FullName, PhoneNumber: in.Phone, Email: strPtr(in.Email),
			PhysicalAddress: strPtr(in.PhysicalAddress), LocationID: in.LocationID, PlanID: in.PlanID, AutoRenew: auto,
		})
		return err
	})
	return sub, err
}

func (s *Service) GetSubscriber(ctx context.Context, tenantID, id uuid.UUID) (store.Subscriber, error) {
	var sub store.Subscriber
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		var err error
		sub, err = q.GetSubscriber(ctx, id)
		if db.IsNotFound(err) {
			return httpx.NotFound("That customer")
		}
		return err
	})
	return sub, err
}

// Password reveals a subscriber's PPPoE password.
func (s *Service) Password(ctx context.Context, tenantID, id uuid.UUID) (string, error) {
	var pw []byte
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		t, err := q.GetTenant(ctx)
		if err != nil {
			return err
		}
		sub, err := q.GetSubscriber(ctx, id)
		if db.IsNotFound(err) {
			return httpx.NotFound("That customer")
		}
		if err != nil {
			return err
		}
		pw, err = s.Sealer.Open(ctx, tenantID, t.DekWrapped, passwordField(id), sub.PppoePasswordEnc)
		return err
	})
	return string(pw), err
}

type ListFilter struct {
	Status string
	Query  string
	Limit  int32
	Offset int32
}

func (s *Service) ListSubscribers(ctx context.Context, tenantID uuid.UUID, f ListFilter) ([]store.ListSubscribersRow, map[string]int32, error) {
	if f.Limit <= 0 || f.Limit > 200 {
		f.Limit = 50
	}
	q := strings.TrimSpace(f.Query)
	if p, ok := phone.Normalize(q); ok {
		q = p
	}
	var rows []store.ListSubscribersRow
	counts := map[string]int32{"all": 0, "active": 0, "expired": 0, "suspended": 0, "cancelled": 0}
	err := s.DB.WithTenant(ctx, tenantID, func(qq *store.Queries) error {
		var err error
		rows, err = qq.ListSubscribers(ctx, store.ListSubscribersParams{Limit: f.Limit, Offset: f.Offset, Status: strPtr(f.Status), Q: strPtr(q)})
		if err != nil {
			return err
		}
		cs, err := qq.CountSubscribersByStatus(ctx)
		for _, c := range cs {
			counts[c.Status] = c.N
			counts["all"] += c.N
		}
		return err
	})
	return rows, counts, err
}

// SetStatus suspends, reactivates or cancels a subscriber. Suspending or
// cancelling also disconnects any live session.
func (s *Service) SetStatus(ctx context.Context, tenantID, id uuid.UUID, status string) (store.Subscriber, error) {
	var sub store.Subscriber
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		cur, err := q.GetSubscriber(ctx, id)
		if db.IsNotFound(err) {
			return httpx.NotFound("That customer")
		}
		if err != nil {
			return err
		}
		if cur.Status == "cancelled" && status != "cancelled" {
			return httpx.Conflict("CANCELLED", "This customer was cancelled.", "Add them again as a new customer.")
		}
		next := status
		if status == "active" && (cur.NextRenewalAt == nil || !cur.NextRenewalAt.After(s.now())) {
			next = "expired" // reactivating an unpaid account leaves it waiting for payment
		}
		if err := q.SetSubscriberStatus(ctx, store.SetSubscriberStatusParams{ID: id, Status: next}); err != nil {
			return err
		}
		cur.Status = next
		sub = cur
		return q.InsertConfigAudit(ctx, store.InsertConfigAuditParams{
			Action: "SET_SUBSCRIBER_STATUS", Payload: []byte(fmt.Sprintf(`{"subscriber":%q,"status":%q}`, cur.PppoeUsername, next)),
			Status: "SUCCESS", InitiatedBy: "tenant:" + tenantID.String(),
		})
	})
	if err == nil && (sub.Status == "suspended" || sub.Status == "cancelled") && s.Disconnector != nil {
		if derr := s.Disconnector.Disconnect(ctx, tenantID, sub.PppoeUsername, "Admin-Reset"); derr != nil {
			return sub, httpx.NewError(502, "DISCONNECT_FAILED", "Saved, but we couldn't disconnect "+sub.PppoeUsername+" from the router.",
				"They'll be blocked at their next login. Check the router is online.")
		}
	}
	return sub, err
}

// ─── Vouchers ───────────────────────────────────────────

func (s *Service) CreateVouchers(ctx context.Context, tenantID, planID uuid.UUID, count int, batch string) ([]store.Voucher, error) {
	if count < 1 || count > 500 {
		return nil, bad("INVALID_COUNT", "Make between 1 and 500 vouchers at a time.", "")
	}
	batch = strings.TrimSpace(batch)
	if batch == "" {
		batch = s.now().Format("2006-01-02 15:04")
	}
	var out []store.Voucher
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		plan, err := q.GetPlan(ctx, planID)
		if err != nil || plan.AccessType != "hotspot" {
			return bad("INVALID_PLAN", "Vouchers need a Hotspot package.", "")
		}
		for len(out) < count {
			v, err := q.CreateVoucher(ctx, store.CreateVoucherParams{PlanID: planID, Code: random.Code(8), Batch: &batch})
			if _, dup := db.UniqueViolation(err); dup {
				continue
			}
			if err != nil {
				return err
			}
			out = append(out, v)
		}
		return nil
	})
	return out, err
}

func (s *Service) ListVouchers(ctx context.Context, tenantID uuid.UUID, batch string, limit int32) ([]store.ListVouchersRow, error) {
	if limit <= 0 || limit > 1000 {
		limit = 200
	}
	var out []store.ListVouchersRow
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		var err error
		out, err = q.ListVouchers(ctx, store.ListVouchersParams{Limit: limit, Batch: strPtr(batch)})
		return err
	})
	return out, err
}
