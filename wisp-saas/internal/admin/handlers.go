package admin

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/nabukob/lingarnew/wisp-saas/internal/auth"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/ratelimit"
)

// Routes mounts /admin/v1. clientIP must be the proxy-aware client address.
//
//	POST /admin/v1/login                      {email, password, code} → {token, expires_at}
//	POST /admin/v1/logout
//	GET  /admin/v1/me
//	GET  /admin/v1/overview
//	GET  /admin/v1/tenants?q=&standing=trial|trial_ended|paying|expired|lapsed|unpaid
//	GET  /admin/v1/tenants/{id}
//	POST /admin/v1/tenants/{id}/trial         {days, note}
//	POST /admin/v1/tenants/{id}/subscription  {months, note}
//	POST /admin/v1/tenants/{id}/sms-credits   {credits, note}
//	GET  /admin/v1/audit
func (s *Service) Routes(r chi.Router, clientIP func(*http.Request) string) {
	login := ratelimit.New(5, 5) // per IP per minute: slows password and code guessing
	r.With(login.Middleware(clientIP)).Post("/admin/v1/login", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Email    string `json:"email"`
			Password string `json:"password"`
			Code     string `json:"code"`
		}
		if err := httpx.Decode(r, &in); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		token, exp, err := s.Login(r.Context(), in.Email, in.Password, in.Code, clientIP(r))
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"token": token, "expires_at": exp})
	})

	r.Group(func(r chi.Router) {
		r.Use(s.Require)
		r.Post("/admin/v1/logout", func(w http.ResponseWriter, r *http.Request) {
			_ = s.Logout(r.Context(), auth.BearerToken(r))
			w.WriteHeader(http.StatusNoContent)
		})
		r.Get("/admin/v1/me", func(w http.ResponseWriter, r *http.Request) {
			httpx.JSON(w, http.StatusOK, current(r.Context()))
		})
		r.Get("/admin/v1/overview", func(w http.ResponseWriter, r *http.Request) {
			o, err := s.Overview(r.Context())
			respond(w, r, o, err)
		})
		r.Get("/admin/v1/tenants", func(w http.ResponseWriter, r *http.Request) {
			rows, err := s.Tenants(r.Context(), r.URL.Query().Get("q"), r.URL.Query().Get("standing"))
			respond(w, r, map[string]any{"tenants": rows}, err)
		})
		r.Get("/admin/v1/tenants/{id}", func(w http.ResponseWriter, r *http.Request) {
			id, err := tenantID(r)
			if err != nil {
				httpx.Fail(w, r, err)
				return
			}
			d, err := s.Tenant(r.Context(), id)
			respond(w, r, d, err)
		})
		r.Post("/admin/v1/tenants/{id}/trial", func(w http.ResponseWriter, r *http.Request) {
			var in struct {
				Days int    `json:"days"`
				Note string `json:"note"`
			}
			id, err := decodeFor(r, &in)
			if err == nil {
				var row any
				row, err = s.ExtendTrial(r.Context(), current(r.Context()).ID, id, in.Days, in.Note)
				respond(w, r, row, err)
				return
			}
			httpx.Fail(w, r, err)
		})
		r.Post("/admin/v1/tenants/{id}/subscription", func(w http.ResponseWriter, r *http.Request) {
			var in struct {
				Months int    `json:"months"`
				Note   string `json:"note"`
			}
			id, err := decodeFor(r, &in)
			if err == nil {
				var row any
				row, err = s.AddSubscription(r.Context(), current(r.Context()).ID, id, in.Months, in.Note)
				respond(w, r, row, err)
				return
			}
			httpx.Fail(w, r, err)
		})
		r.Post("/admin/v1/tenants/{id}/sms-credits", func(w http.ResponseWriter, r *http.Request) {
			var in struct {
				Credits int    `json:"credits"`
				Note    string `json:"note"`
			}
			id, err := decodeFor(r, &in)
			if err == nil {
				var row any
				row, err = s.GrantSMSCredits(r.Context(), current(r.Context()).ID, id, in.Credits, in.Note)
				respond(w, r, row, err)
				return
			}
			httpx.Fail(w, r, err)
		})
		r.Get("/admin/v1/audit", func(w http.ResponseWriter, r *http.Request) {
			limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
			if limit <= 0 || limit > 500 {
				limit = 100
			}
			rows, err := s.Audit(r.Context(), int32(limit))
			respond(w, r, map[string]any{"entries": rows}, err)
		})
	})
}

func tenantID(r *http.Request) (uuid.UUID, error) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		return uuid.Nil, httpx.NotFound("That ISP")
	}
	return id, nil
}

func decodeFor(r *http.Request, v any) (uuid.UUID, error) {
	id, err := tenantID(r)
	if err != nil {
		return id, err
	}
	return id, httpx.Decode(r, v)
}

func respond(w http.ResponseWriter, r *http.Request, v any, err error) {
	if err != nil {
		httpx.Fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, v)
}
