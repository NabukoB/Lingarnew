package customers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/nabukob/lingarnew/wisp-saas/internal/auth"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/phone"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
)

type SubscriberView struct {
	ID            uuid.UUID  `json:"id"`
	AccountID     string     `json:"account_id"`
	FullName      string     `json:"full_name"`
	Phone         string     `json:"phone"`
	PhonePretty   string     `json:"phone_pretty"`
	Email         *string    `json:"email"`
	Address       *string    `json:"physical_address"`
	Status        string     `json:"status"`
	PlanID        *uuid.UUID `json:"plan_id"`
	PlanName      *string    `json:"plan_name,omitempty"`
	PlanPriceKES  *int32     `json:"plan_price_kes,omitempty"`
	LocationID    *uuid.UUID `json:"location_id"`
	NextRenewalAt *time.Time `json:"next_renewal_at"`
	CreditKES     int32      `json:"credit_kes"`
	AutoRenew     bool       `json:"auto_renew"`
	Online        *bool      `json:"online,omitempty"`
}

func subView(s store.Subscriber) SubscriberView {
	return SubscriberView{
		ID: s.ID, AccountID: s.PppoeUsername, FullName: s.FullName, Phone: s.PhoneNumber, PhonePretty: phone.Pretty(s.PhoneNumber),
		Email: s.Email, Address: s.PhysicalAddress, Status: s.Status, PlanID: s.PlanID, LocationID: s.LocationID,
		NextRenewalAt: s.NextRenewalAt, CreditKES: s.CreditCents / 100, AutoRenew: s.AutoRenew,
	}
}

type PlanView struct {
	ID                uuid.UUID `json:"id"`
	Name              string    `json:"name"`
	AccessType        string    `json:"access_type"`
	PriceKES          int32     `json:"price_kes"`
	DurationDays      *int32    `json:"duration_days"`
	DurationMinutes   *int32    `json:"duration_minutes"`
	IsTrial           bool      `json:"is_trial"`
	DataCapMB         *int64    `json:"data_cap_mb"`
	BandwidthDownKbps int32     `json:"bandwidth_down_kbps"`
	BandwidthUpKbps   int32     `json:"bandwidth_up_kbps"`
	MaxDevices        int32     `json:"max_devices"`
	IsActive          bool      `json:"is_active"`
	SortOrder         int32     `json:"sort_order"`
}

func PlanToView(p store.Plan) PlanView {
	return PlanView{p.ID, p.Name, p.AccessType, p.PriceCents / 100, p.DurationDays, p.DurationMinutes, p.IsTrial, p.DataCapMb,
		p.BandwidthDownKbps, p.BandwidthUpKbps, p.MaxDevices, p.IsActive, p.SortOrder}
}

func idParam(r *http.Request) (uuid.UUID, error) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		return uuid.Nil, httpx.NotFound("That record")
	}
	return id, nil
}

func (s *Service) Routes(r chi.Router) {
	tid := func(r *http.Request) uuid.UUID { return auth.TenantID(r.Context()) }

	r.Get("/v1/plans", func(w http.ResponseWriter, r *http.Request) {
		ps, err := s.ListPlans(r.Context(), tid(r), r.URL.Query().Get("type"))
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		out := make([]PlanView, 0, len(ps))
		for _, p := range ps {
			out = append(out, PlanToView(p))
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"plans": out})
	})
	r.Post("/v1/plans", func(w http.ResponseWriter, r *http.Request) {
		var in PlanInput
		if err := httpx.Decode(r, &in); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		p, err := s.CreatePlan(r.Context(), tid(r), in)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusCreated, PlanToView(p))
	})
	r.Put("/v1/plans/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, err := idParam(r)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		var in PlanInput
		if err := httpx.Decode(r, &in); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		p, err := s.UpdatePlan(r.Context(), tid(r), id, in)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusOK, PlanToView(p))
	})

	r.Get("/v1/locations", func(w http.ResponseWriter, r *http.Request) {
		ls, err := s.ListLocations(r.Context(), tid(r))
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"locations": ls})
	})
	r.Post("/v1/locations", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Name    string `json:"name"`
			Address string `json:"address"`
		}
		if err := httpx.Decode(r, &in); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		l, err := s.CreateLocation(r.Context(), tid(r), in.Name, in.Address)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusCreated, l)
	})

	r.Get("/v1/subscribers", func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		limit, _ := strconv.Atoi(q.Get("limit"))
		offset, _ := strconv.Atoi(q.Get("offset"))
		rows, counts, err := s.ListSubscribers(r.Context(), tid(r), ListFilter{Status: q.Get("status"), Query: q.Get("q"), Limit: int32(limit), Offset: int32(offset)})
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		out := make([]SubscriberView, 0, len(rows))
		for _, row := range rows {
			v := subView(store.Subscriber{ID: row.ID, PppoeUsername: row.PppoeUsername, FullName: row.FullName, PhoneNumber: row.PhoneNumber,
				Email: row.Email, PhysicalAddress: row.PhysicalAddress, Status: row.Status, PlanID: row.PlanID, LocationID: row.LocationID,
				NextRenewalAt: row.NextRenewalAt, CreditCents: row.CreditCents, AutoRenew: row.AutoRenew})
			v.PlanName = row.PlanName
			if row.PlanPriceCents != nil {
				p := *row.PlanPriceCents / 100
				v.PlanPriceKES = &p
			}
			online := row.Online
			v.Online = &online
			out = append(out, v)
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"subscribers": out, "counts": counts})
	})
	r.Post("/v1/subscribers", func(w http.ResponseWriter, r *http.Request) {
		var in SubscriberInput
		if err := httpx.Decode(r, &in); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		sub, pw, err := s.CreateSubscriber(r.Context(), tid(r), in)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusCreated, map[string]any{"subscriber": subView(sub), "pppoe_password": pw})
	})
	r.Get("/v1/subscribers/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, err := idParam(r)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		sub, err := s.GetSubscriber(r.Context(), tid(r), id)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusOK, subView(sub))
	})
	r.Put("/v1/subscribers/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, err := idParam(r)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		var in SubscriberInput
		if err := httpx.Decode(r, &in); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		sub, err := s.UpdateSubscriber(r.Context(), tid(r), id, in)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusOK, subView(sub))
	})
	r.Get("/v1/subscribers/{id}/password", func(w http.ResponseWriter, r *http.Request) {
		id, err := idParam(r)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		pw, err := s.Password(r.Context(), tid(r), id)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		httpx.JSON(w, http.StatusOK, map[string]string{"pppoe_password": pw})
	})
	for path, status := range map[string]string{"suspend": "suspended", "reactivate": "active", "cancel": "cancelled"} {
		status := status
		r.Post("/v1/subscribers/{id}/"+path, func(w http.ResponseWriter, r *http.Request) {
			id, err := idParam(r)
			if err != nil {
				httpx.Fail(w, r, err)
				return
			}
			sub, err := s.SetStatus(r.Context(), tid(r), id, status)
			if err != nil {
				httpx.Fail(w, r, err)
				return
			}
			httpx.JSON(w, http.StatusOK, subView(sub))
		})
	}

	r.Get("/v1/vouchers", func(w http.ResponseWriter, r *http.Request) {
		vs, err := s.ListVouchers(r.Context(), tid(r), r.URL.Query().Get("batch"), 500)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"vouchers": vs})
	})
	r.Post("/v1/vouchers", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			PlanID uuid.UUID `json:"plan_id"`
			Count  int       `json:"count"`
			Batch  string    `json:"batch"`
		}
		if err := httpx.Decode(r, &in); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		vs, err := s.CreateVouchers(r.Context(), tid(r), in.PlanID, in.Count, in.Batch)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusCreated, map[string]any{"vouchers": vs})
	})
}
