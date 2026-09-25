package router

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/nabukob/lingarnew/wisp-saas/internal/auth"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/db"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
)

// View is a router as the dashboard sees it (no credentials).
type View struct {
	ID              uuid.UUID  `json:"id"`
	LocationID      uuid.UUID  `json:"location_id"`
	LocationName    string     `json:"location_name,omitempty"`
	Name            string     `json:"name"`
	Status          string     `json:"status"`
	TunnelIP        string     `json:"tunnel_ip"`
	BoardName       *string    `json:"board_name"`
	FirmwareVersion *string    `json:"firmware_version"`
	SerialNumber    *string    `json:"serial_number"`
	HotspotPorts    []string   `json:"hotspot_ports"`
	PPPoEPorts      []string   `json:"pppoe_ports"`
	Connected       bool       `json:"connected"` // the router finished the setup script
	LastSeenAt      *time.Time `json:"last_seen_at"`
	StatusChangedAt time.Time  `json:"status_changed_at"`
	LastConfigPush  *time.Time `json:"last_config_push"`
	ActiveSessions  int32      `json:"active_sessions"`
	CreatedAt       time.Time  `json:"created_at"`
}

func ToView(r store.Router) View {
	return View{ID: r.ID, LocationID: r.LocationID, Name: r.Name, Status: r.Status, TunnelIP: r.TunnelIp.String(),
		BoardName: r.BoardName, FirmwareVersion: r.FirmwareVersion, SerialNumber: r.SerialNumber,
		HotspotPorts: r.HotspotPorts, PPPoEPorts: r.PppoePorts, Connected: r.WgPublicKey != nil,
		LastSeenAt: r.LastSeenAt, StatusChangedAt: r.StatusChangedAt, LastConfigPush: r.LastConfigPush, CreatedAt: r.CreatedAt}
}

func routerID(r *http.Request) (uuid.UUID, error) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		return uuid.Nil, httpx.NotFound("That router")
	}
	return id, nil
}

// Routes are the dashboard endpoints (behind auth.Require).
func (s *Service) Routes(r chi.Router) {
	r.Get("/v1/routers", func(w http.ResponseWriter, r *http.Request) {
		var out []View
		err := s.DB.WithTenant(r.Context(), auth.TenantID(r.Context()), func(q *store.Queries) error {
			rows, err := q.ListRouters(r.Context())
			if err != nil {
				return err
			}
			out = make([]View, 0, len(rows))
			for _, row := range rows {
				v := ToView(store.Router{ID: row.ID, TenantID: row.TenantID, LocationID: row.LocationID, Name: row.Name,
					SerialNumber: row.SerialNumber, BoardName: row.BoardName, Architecture: row.Architecture, FirmwareVersion: row.FirmwareVersion,
					TunnelIp: row.TunnelIp, WgPublicKey: row.WgPublicKey, HotspotPorts: row.HotspotPorts, PppoePorts: row.PppoePorts,
					Status: row.Status, LastSeenAt: row.LastSeenAt, StatusChangedAt: row.StatusChangedAt, LastConfigPush: row.LastConfigPush, CreatedAt: row.CreatedAt})
				v.LocationName, v.ActiveSessions = row.LocationName, row.ActiveSessions
				out = append(out, v)
			}
			return nil
		})
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"routers": out})
	})
	r.Post("/v1/routers", func(w http.ResponseWriter, r *http.Request) {
		var in CreateInput
		if err := httpx.Decode(r, &in); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		rt, setup, err := s.Create(r.Context(), auth.TenantID(r.Context()), in)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusCreated, map[string]any{"router": ToView(rt), "setup": setup})
	})
	r.Get("/v1/routers/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, err := routerID(r)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		var rt store.Router
		err = s.DB.WithTenant(r.Context(), auth.TenantID(r.Context()), func(q *store.Queries) error {
			rt, err = q.GetRouter(r.Context(), id)
			if db.IsNotFound(err) {
				return httpx.NotFound("That router")
			}
			return err
		})
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusOK, ToView(rt))
	})
	r.Put("/v1/routers/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, err := routerID(r)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		var in CreateInput
		if err := httpx.Decode(r, &in); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		rt, setup, err := s.UpdatePorts(r.Context(), auth.TenantID(r.Context()), id, in.Name, in.HotspotPorts, in.PPPoEPorts)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"router": ToView(rt), "setup": setup})
	})
	r.Delete("/v1/routers/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, err := routerID(r)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		err = s.DB.WithTenant(r.Context(), auth.TenantID(r.Context()), func(q *store.Queries) error {
			if _, err := q.GetRouter(r.Context(), id); err != nil {
				if db.IsNotFound(err) {
					return httpx.NotFound("That router")
				}
				return err
			}
			return q.DeleteRouter(r.Context(), id)
		})
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
	r.Post("/v1/routers/{id}/setup-command", func(w http.ResponseWriter, r *http.Request) {
		id, err := routerID(r)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		setup, err := s.NewSetupCommand(r.Context(), auth.TenantID(r.Context()), id)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusOK, setup)
	})
	r.Post("/v1/routers/{id}/sync", func(w http.ResponseWriter, r *http.Request) {
		id, err := routerID(r)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		tid := auth.TenantID(r.Context())
		changes, err := s.Sync(r.Context(), tid, id, "tenant:"+tid.String())
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"changes": changes})
	})
	r.Get("/v1/routers/{id}/checklist", func(w http.ResponseWriter, r *http.Request) {
		id, err := routerID(r)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		items, err := s.Checklist(r.Context(), auth.TenantID(r.Context()), id)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"items": items})
	})
	r.Get("/v1/routers/{id}/audit", func(w http.ResponseWriter, r *http.Request) {
		id, err := routerID(r)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		if limit <= 0 || limit > 200 {
			limit = 50
		}
		var rows []store.ConfigAudit
		err = s.DB.WithTenant(r.Context(), auth.TenantID(r.Context()), func(q *store.Queries) error {
			rows, err = q.ListConfigAudit(r.Context(), store.ListConfigAuditParams{RouterID: &id, Limit: int32(limit)})
			return err
		})
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"entries": rows})
	})
	r.Get("/v1/routers/{id}/sessions", func(w http.ResponseWriter, r *http.Request) {
		id, err := routerID(r)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		var rows []store.Session
		err = s.DB.WithTenant(r.Context(), auth.TenantID(r.Context()), func(q *store.Queries) error {
			rows, err = q.ActiveSessionsOnRouter(r.Context(), id)
			return err
		})
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"sessions": rows})
	})
}

// OnboardRoutes are public endpoints the router's /tool fetch calls.
func (s *Service) OnboardRoutes(r chi.Router) {
	r.Get("/onboard/{token}", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write([]byte(s.Script(r.Context(), chi.URLParam(r, "token"))))
	})
	r.Get("/onboard/{token}/hotspot/{file}", func(w http.ResponseWriter, r *http.Request) {
		b, err := s.HotspotFile(r.Context(), chi.URLParam(r, "token"), chi.URLParam(r, "file"))
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write(b)
	})
	r.Post("/onboard/{token}", func(w http.ResponseWriter, r *http.Request) {
		var in CallbackInput
		if err := httpx.Decode(r, &in); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		if err := s.Complete(r.Context(), chi.URLParam(r, "token"), in); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
}
