package session

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/netip"
)

// Handler serves the rlm_rest endpoints. FreeRADIUS runs in the same pod and
// authenticates with HTTP Basic (user "freeradius", password RADIUS_API_TOKEN).
// The NAS address comes from %{Packet-Src-IP-Address} in the URL.
//
//	POST /radius/client?nas=IP      dynamic client secret (404 = unknown router)
//	POST /radius/authorize?nas=IP   check + reply attributes
//	POST /radius/accounting?nas=IP  Start / Interim-Update / Stop
func (s *Service) Handler(token string) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		if err := s.DB.Pool.Ping(r.Context()); err != nil {
			http.Error(w, "database unreachable", http.StatusServiceUnavailable)
			return
		}
		_, _ = w.Write([]byte("ok"))
	})
	guard := func(fn func(w http.ResponseWriter, r *http.Request, nas netip.Addr, a Attrs)) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			u, p, ok := r.BasicAuth()
			if !ok || u != "freeradius" || subtle.ConstantTimeCompare([]byte(p), []byte(token)) != 1 {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			nas, err := netip.ParseAddr(r.URL.Query().Get("nas"))
			if err != nil {
				http.Error(w, "nas query parameter must be the packet source IP", http.StatusBadRequest)
				return
			}
			var a Attrs
			if r.ContentLength != 0 {
				if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&a); err != nil {
					http.Error(w, "body must be rlm_rest JSON", http.StatusBadRequest)
					return
				}
			}
			fn(w, r, nas.Unmap(), a)
		}
	}
	reply := func(w http.ResponseWriter, v any) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(v)
	}
	mux.HandleFunc("POST /radius/client", guard(func(w http.ResponseWriter, r *http.Request, nas netip.Addr, _ Attrs) {
		rid, secret, err := s.ClientSecret(r.Context(), nas)
		if errors.Is(err, ErrUnknownNAS) {
			http.Error(w, "unknown router", http.StatusNotFound)
			return
		}
		if err != nil {
			slog.Error("radius client lookup", "nas", nas, "err", err)
			http.Error(w, "lookup failed", http.StatusInternalServerError)
			return
		}
		reply(w, Reply{
			"control:FreeRADIUS-Client-IP-Address": nas.String(),
			"control:FreeRADIUS-Client-Secret":     secret,
			"control:FreeRADIUS-Client-Shortname":  rid.String(),
			"control:FreeRADIUS-Client-NAS-Type":   "other",
		})
	}))
	mux.HandleFunc("POST /radius/authorize", guard(func(w http.ResponseWriter, r *http.Request, nas netip.Addr, a Attrs) {
		out, err := s.Authorize(r.Context(), nas, a)
		if err != nil {
			slog.Error("radius authorize", "nas", nas, "username", a.Str("User-Name"), "err", err)
			// 5xx makes rlm_rest fail; FreeRADIUS then rejects. Customers
			// retry automatically, so a DB blip doesn't lock anyone out for long.
			http.Error(w, "authorize failed", http.StatusInternalServerError)
			return
		}
		reply(w, out)
	}))
	mux.HandleFunc("POST /radius/accounting", guard(func(w http.ResponseWriter, r *http.Request, nas netip.Addr, a Attrs) {
		if err := s.Accounting(r.Context(), nas, a); err != nil {
			slog.Error("radius accounting", "nas", nas, "username", a.Str("User-Name"), "err", err)
			http.Error(w, "accounting failed", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	return mux
}
