package tenant

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/nabukob/lingarnew/wisp-saas/internal/auth"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
)

// PublicRoutes mounts signup and login.
func (s *Service) PublicRoutes(r chi.Router) {
	r.Post("/v1/auth/signup", func(w http.ResponseWriter, r *http.Request) {
		var in SignupInput
		if err := httpx.Decode(r, &in); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		t, token, err := s.Signup(r.Context(), in)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusCreated, map[string]any{"token": token, "tenant": ToView(t)})
	})
	r.Post("/v1/auth/login", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := httpx.Decode(r, &in); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		token, expires, err := s.Auth.Login(r.Context(), in.Email, in.Password)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"token": token, "expires_at": expires})
	})
	r.Get("/v1/auth/prefix-suggestions", func(w http.ResponseWriter, r *http.Request) {
		c := PrefixCandidates(r.URL.Query().Get("name"))
		if len(c) > 5 {
			c = c[:5]
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"suggestions": c})
	})
}

// Routes mounts the signed-in account endpoints.
func (s *Service) Routes(r chi.Router) {
	r.Post("/v1/auth/logout", func(w http.ResponseWriter, r *http.Request) {
		if err := s.Auth.Logout(r.Context(), auth.TenantID(r.Context()), auth.BearerToken(r)); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
	r.Get("/v1/me", func(w http.ResponseWriter, r *http.Request) {
		t, err := s.Get(r.Context(), auth.TenantID(r.Context()))
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusOK, ToView(t))
	})
	r.Put("/v1/settings", func(w http.ResponseWriter, r *http.Request) {
		var in SettingsInput
		if err := httpx.Decode(r, &in); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		t, err := s.UpdateSettings(r.Context(), auth.TenantID(r.Context()), in)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusOK, ToView(t))
	})
	r.Put("/v1/settings/mpesa-credentials", func(w http.ResponseWriter, r *http.Request) {
		var in MpesaCredentials
		if err := httpx.Decode(r, &in); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		if err := s.SetMpesaCredentials(r.Context(), auth.TenantID(r.Context()), in); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
	r.Post("/v1/settings/password", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Current string `json:"current_password"`
			New     string `json:"new_password"`
		}
		if err := httpx.Decode(r, &in); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		if err := s.ChangePassword(r.Context(), auth.TenantID(r.Context()), in.Current, in.New); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
}
