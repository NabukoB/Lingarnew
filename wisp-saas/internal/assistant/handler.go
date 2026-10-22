package assistant

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/nabukob/lingarnew/wisp-saas/internal/auth"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/db"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
)

// Routes mounts the signed-in assistant endpoints.
//
//	GET  /v1/assistant          → {"enabled": bool, "remaining_today": n}
//	POST /v1/assistant/chat     {"messages": [{role, text}...]} → text/event-stream of Event
func (s *Service) Routes(r chi.Router) {
	r.Get("/v1/assistant", func(w http.ResponseWriter, r *http.Request) {
		remaining := s.DailyLimit
		if s.Client != nil {
			_ = s.DB.WithTenant(r.Context(), auth.TenantID(r.Context()), func(q *store.Queries) error {
				u, err := q.GetAssistantUsage(r.Context(), s.day())
				if err == nil {
					remaining = max(0, s.DailyLimit-int(u.Questions))
				} else if !db.IsNotFound(err) {
					return err
				}
				return nil
			})
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"enabled": s.Client != nil, "remaining_today": remaining})
	})
	r.Post("/v1/assistant/chat", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Messages []Message `json:"messages"`
		}
		if err := httpx.Decode(r, &in); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		// Answers with several lookups outlive the server's 60s write timeout.
		_ = http.NewResponseController(w).SetWriteDeadline(time.Now().Add(5 * time.Minute))
		flusher, _ := w.(http.Flusher)
		started := false
		emit := func(e Event) {
			if !started {
				started = true
				h := w.Header()
				h.Set("Content-Type", "text/event-stream")
				h.Set("Cache-Control", "no-cache")
				h.Set("X-Accel-Buffering", "no")
				w.WriteHeader(http.StatusOK)
			}
			b, _ := json.Marshal(e)
			fmt.Fprintf(w, "data: %s\n\n", b)
			if flusher != nil {
				flusher.Flush()
			}
		}
		if err := s.Ask(r.Context(), auth.TenantID(r.Context()), in.Messages, emit); err != nil {
			if !started {
				httpx.Fail(w, r, err)
				return
			}
			emit(Event{Type: "error", Error: &apiError{Code: "ASSISTANT_FAILED", Message: "The answer stopped before it finished.", Hint: "Ask again."}})
		}
	})
}
