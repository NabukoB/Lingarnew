// Package portal serves the captive portal's public API: packages, M-Pesa
// purchase, status polling, reconnect by M-Pesa code, vouchers and trials.
package portal

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/nabukob/lingarnew/wisp-saas/internal/billing"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/db"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/phone"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/ratelimit"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
)

type Handler struct {
	DB      *db.DB
	Billing *billing.Service
	Limiter *ratelimit.Limiter
}

type Package struct {
	ID         uuid.UUID `json:"id"`
	Label      string    `json:"label"`
	Minutes    int32     `json:"minutes"`
	Mbps       int32     `json:"mbps"`
	PriceKES   int32     `json:"price_kes"`
	MaxDevices int32     `json:"max_devices"`
	IsTrial    bool      `json:"is_trial"`
}

type Info struct {
	Slug           string    `json:"slug"`
	Name           string    `json:"name"`
	SupportPhone   string    `json:"support_phone"`
	PrimaryColor   string    `json:"primary_color"`
	LogoURL        *string   `json:"logo_url"`
	ShortcodeLabel string    `json:"shortcode_label"`
	Packages       []Package `json:"packages"`
	Trial          *Package  `json:"trial"`
}

func (h *Handler) resolve(ctx context.Context, slug string) (uuid.UUID, error) {
	var id uuid.UUID
	err := h.DB.WithoutTenant(ctx, func(q *store.Queries) error {
		row, err := q.TenantBySlug(ctx, slug)
		id = row.TenantID
		return err
	})
	if err != nil {
		return uuid.Nil, httpx.NotFound("This Wi-Fi network")
	}
	return id, nil
}

func (h *Handler) info(ctx context.Context, tenantID uuid.UUID) (Info, error) {
	var out Info
	err := h.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		t, err := q.GetTenant(ctx)
		if err != nil {
			return err
		}
		plans, err := q.ListActiveHotspotPlans(ctx)
		if err != nil {
			return err
		}
		label := "M-Pesa"
		if t.MpesaShortcode != nil {
			kind := "Till"
			if t.MpesaShortcodeType == "paybill" {
				kind = "Paybill"
			}
			label += " · " + kind + " " + *t.MpesaShortcode
		}
		support := ""
		if t.SupportPhone != nil {
			support = phone.Pretty(*t.SupportPhone)
		}
		out = Info{Slug: t.Slug, Name: t.Name, SupportPhone: support, PrimaryColor: t.PrimaryColor, LogoURL: t.LogoUrl, ShortcodeLabel: label, Packages: []Package{}}
		for _, p := range plans {
			pk := Package{ID: p.ID, Label: p.Name, Minutes: *p.DurationMinutes, Mbps: p.BandwidthDownKbps / 1000, PriceKES: p.PriceCents / 100, MaxDevices: p.MaxDevices, IsTrial: p.IsTrial}
			if p.IsTrial {
				if out.Trial == nil {
					out.Trial = &pk
				}
				continue
			}
			out.Packages = append(out.Packages, pk)
		}
		return nil
	})
	return out, err
}

func routerParam(s string) *uuid.UUID {
	if id, err := uuid.Parse(strings.TrimSpace(s)); err == nil {
		return &id
	}
	return nil
}

type purchaseResponse struct {
	PurchaseID uuid.UUID  `json:"purchase_id"`
	ExpiresAt  *time.Time `json:"expires_at"`
	LoginUser  string     `json:"login_username"`
}

func (h *Handler) Routes(r chi.Router) {
	r.Group(func(r chi.Router) {
		if h.Limiter != nil {
			r.Use(h.Limiter.Middleware(h.Billing.ClientIP))
		}
		r.Get("/v1/portal/by-domain/{domain}", func(w http.ResponseWriter, r *http.Request) {
			var id uuid.UUID
			err := h.DB.WithoutTenant(r.Context(), func(q *store.Queries) error {
				var err error
				id, err = q.TenantByPortalDomain(r.Context(), chi.URLParam(r, "domain"))
				return err
			})
			if err != nil || id == uuid.Nil {
				httpx.Fail(w, r, httpx.NotFound("This Wi-Fi network"))
				return
			}
			in, err := h.info(r.Context(), id)
			if err != nil {
				httpx.Fail(w, r, err)
				return
			}
			httpx.JSON(w, http.StatusOK, in)
		})
		r.Route("/v1/portal/{slug}", func(r chi.Router) {
			withTenant := func(fn func(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID)) http.HandlerFunc {
				return func(w http.ResponseWriter, r *http.Request) {
					id, err := h.resolve(r.Context(), chi.URLParam(r, "slug"))
					if err != nil {
						httpx.Fail(w, r, err)
						return
					}
					fn(w, r, id)
				}
			}
			r.Get("/", withTenant(func(w http.ResponseWriter, r *http.Request, tid uuid.UUID) {
				in, err := h.info(r.Context(), tid)
				if err != nil {
					httpx.Fail(w, r, err)
					return
				}
				httpx.JSON(w, http.StatusOK, in)
			}))
			r.Post("/buy", withTenant(func(w http.ResponseWriter, r *http.Request, tid uuid.UUID) {
				var in struct {
					PackageID uuid.UUID `json:"package_id"`
					Phone     string    `json:"phone"`
					MAC       string    `json:"mac"`
					RouterID  string    `json:"router_id"`
				}
				if err := httpx.Decode(r, &in); err != nil {
					httpx.Fail(w, r, err)
					return
				}
				p, err := h.Billing.BuyHotspot(r.Context(), tid, in.PackageID, in.Phone, in.MAC, routerParam(in.RouterID))
				if err != nil {
					httpx.Fail(w, r, err)
					return
				}
				httpx.JSON(w, http.StatusAccepted, purchaseResponse{PurchaseID: p.ID})
			}))
			r.Get("/purchases/{id}", withTenant(func(w http.ResponseWriter, r *http.Request, tid uuid.UUID) {
				id, err := uuid.Parse(chi.URLParam(r, "id"))
				if err != nil {
					httpx.Fail(w, r, httpx.NotFound("That purchase"))
					return
				}
				st, err := h.Billing.PurchaseStatus(r.Context(), tid, id, r.URL.Query().Get("mac"))
				if err != nil {
					httpx.Fail(w, r, err)
					return
				}
				w.Header().Set("Cache-Control", "no-store")
				httpx.JSON(w, http.StatusOK, st)
			}))
			r.Post("/reconnect", withTenant(func(w http.ResponseWriter, r *http.Request, tid uuid.UUID) {
				var in struct {
					Receipt string `json:"receipt"`
					MAC     string `json:"mac"`
				}
				if err := httpx.Decode(r, &in); err != nil {
					httpx.Fail(w, r, err)
					return
				}
				p, err := h.Billing.Reconnect(r.Context(), tid, in.Receipt, in.MAC)
				if err != nil {
					httpx.Fail(w, r, err)
					return
				}
				httpx.JSON(w, http.StatusOK, purchaseResponse{PurchaseID: p.ID, ExpiresAt: p.ExpiresAt, LoginUser: billing.NormalizeMAC(in.MAC)})
			}))
			r.Post("/voucher", withTenant(func(w http.ResponseWriter, r *http.Request, tid uuid.UUID) {
				var in struct {
					Code     string `json:"code"`
					MAC      string `json:"mac"`
					RouterID string `json:"router_id"`
				}
				if err := httpx.Decode(r, &in); err != nil {
					httpx.Fail(w, r, err)
					return
				}
				p, err := h.Billing.RedeemVoucher(r.Context(), tid, in.Code, in.MAC, routerParam(in.RouterID))
				if err != nil {
					httpx.Fail(w, r, err)
					return
				}
				httpx.JSON(w, http.StatusOK, purchaseResponse{PurchaseID: p.ID, ExpiresAt: p.ExpiresAt, LoginUser: billing.NormalizeMAC(in.MAC)})
			}))
			r.Post("/trial", withTenant(func(w http.ResponseWriter, r *http.Request, tid uuid.UUID) {
				var in struct {
					MAC      string `json:"mac"`
					RouterID string `json:"router_id"`
				}
				if err := httpx.Decode(r, &in); err != nil {
					httpx.Fail(w, r, err)
					return
				}
				p, err := h.Billing.StartTrial(r.Context(), tid, in.MAC, routerParam(in.RouterID))
				if err != nil {
					httpx.Fail(w, r, err)
					return
				}
				httpx.JSON(w, http.StatusOK, purchaseResponse{PurchaseID: p.ID, ExpiresAt: p.ExpiresAt, LoginUser: billing.NormalizeMAC(in.MAC)})
			}))
		})
	})
}
