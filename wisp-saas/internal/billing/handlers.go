package billing

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/nabukob/lingarnew/wisp-saas/internal/auth"
	"github.com/nabukob/lingarnew/wisp-saas/internal/mpesa"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/phone"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
)

type PaymentView struct {
	ID         uuid.UUID  `json:"id"`
	Kind       string     `json:"kind"` // hotspot | pppoe | unmatched
	Status     string     `json:"status"`
	AmountKES  int32      `json:"amount_kes"`
	Receipt    *string    `json:"receipt"`
	Phone      string     `json:"phone"`
	AccountID  *string    `json:"account_id"`
	Name       *string    `json:"name"`
	Plan       *string    `json:"plan"`
	Reference  string     `json:"reference"`
	At         time.Time  `json:"at"`
	Source     string     `json:"source"`
	Subscriber *uuid.UUID `json:"subscriber_id"`
}

func paymentView(r store.ListPaymentsRow) PaymentView {
	kind := "pppoe"
	switch {
	case r.Status == "unmatched":
		kind = "unmatched"
	case r.HotspotPurchaseID != nil:
		kind = "hotspot"
	}
	at := r.CreatedAt
	if r.CallbackReceivedAt != nil {
		at = *r.CallbackReceivedAt
	}
	ph := ""
	if r.PhoneNumber != nil {
		ph = phone.Masked(*r.PhoneNumber)
	}
	return PaymentView{ID: r.ID, Kind: kind, Status: r.Status, AmountKES: r.AmountCents / 100, Receipt: r.MpesaReceiptNumber, Phone: ph,
		AccountID: r.PppoeUsername, Name: r.FullName, Plan: r.PlanName, Reference: r.AccountReference, At: at, Source: r.Source, Subscriber: r.SubscriberID}
}

// Routes mounts signed-in billing endpoints.
func (s *Service) Routes(r chi.Router) {
	tid := func(r *http.Request) uuid.UUID { return auth.TenantID(r.Context()) }

	r.Get("/v1/payments", func(w http.ResponseWriter, r *http.Request) {
		var status *string
		if v := r.URL.Query().Get("status"); v != "" {
			status = &v
		}
		var rows []store.ListPaymentsRow
		err := s.DB.WithTenant(r.Context(), tid(r), func(q *store.Queries) error {
			var err error
			rows, err = q.ListPayments(r.Context(), store.ListPaymentsParams{Limit: 100, Status: status})
			return err
		})
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		out := make([]PaymentView, 0, len(rows))
		for _, row := range rows {
			out = append(out, paymentView(row))
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"payments": out})
	})
	r.Post("/v1/payments/{id}/match", func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			httpx.Fail(w, r, httpx.NotFound("That payment"))
			return
		}
		var in struct {
			SubscriberID uuid.UUID `json:"subscriber_id"`
		}
		if err := httpx.Decode(r, &in); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		if err := s.MatchPayment(r.Context(), tid(r), id, in.SubscriberID); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
	r.Post("/v1/subscribers/{id}/stk-push", func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			httpx.Fail(w, r, httpx.NotFound("That customer"))
			return
		}
		var in struct {
			Phone     string `json:"phone"`
			AmountKES int64  `json:"amount_kes"`
		}
		if r.ContentLength != 0 {
			if err := httpx.Decode(r, &in); err != nil {
				httpx.Fail(w, r, err)
				return
			}
		}
		tx, err := s.ChargeSubscriber(r.Context(), tid(r), id, in.Phone, in.AmountKES)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusAccepted, map[string]any{"transaction_id": tx.ID, "amount_kes": tx.AmountCents / 100, "message": "Prompt sent to " + phone.Pretty(*tx.PhoneNumber)})
	})
	r.Post("/v1/mpesa/register-c2b", func(w http.ResponseWriter, r *http.Request) {
		if err := s.RegisterC2B(r.Context(), tid(r)); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
	r.Post("/v1/billing/subscription", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Phone  string `json:"phone"`
			Months int    `json:"months"`
		}
		if err := httpx.Decode(r, &in); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		tx, err := s.PaySubscription(r.Context(), tid(r), in.Phone, in.Months)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusAccepted, map[string]any{"transaction_id": tx.ID, "amount_kes": tx.AmountCents / 100})
	})
	r.Post("/v1/billing/sms-credits", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Phone   string `json:"phone"`
			Credits int    `json:"credits"`
		}
		if err := httpx.Decode(r, &in); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		tx, err := s.BuySMSCredits(r.Context(), tid(r), in.Phone, in.Credits)
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusAccepted, map[string]any{"transaction_id": tx.ID, "amount_kes": tx.AmountCents / 100})
	})
	r.Get("/v1/transactions/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			httpx.Fail(w, r, httpx.NotFound("That payment"))
			return
		}
		var tx store.MpesaTransaction
		err = s.DB.WithTenant(r.Context(), tid(r), func(q *store.Queries) error {
			var err error
			tx, err = q.GetTx(r.Context(), id)
			return err
		})
		if err != nil {
			httpx.Fail(w, r, httpx.NotFound("That payment"))
			return
		}
		msg := "Waiting for the customer to enter their PIN."
		if tx.Status != "pending" && tx.ResultCode != nil {
			msg = mpesa.UserMessage(int(*tx.ResultCode))
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"id": tx.ID, "status": tx.Status, "receipt": tx.MpesaReceiptNumber, "message": msg})
	})
}

// CallbackRoutes mounts the public Safaricom callback endpoints. They always
// answer {"ResultCode":0} once authorised, so Safaricom doesn't retry forever.
func (s *Service) CallbackRoutes(r chi.Router) {
	r.Post("/v1/mpesa/{slug}/{token}/stk", func(w http.ResponseWriter, r *http.Request) {
		tenantID, err := s.authorizeCallback(r.Context(), chi.URLParam(r, "slug"), chi.URLParam(r, "token"), s.ClientIP(r))
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		var cb mpesa.STKCallback
		if err := json.NewDecoder(io.LimitReader(r.Body, 1<<16)).Decode(&cb); err != nil {
			slog.WarnContext(r.Context(), "bad stk callback body", "err", err)
			httpx.JSON(w, http.StatusOK, mpesa.Ack)
			return
		}
		if err := s.HandleSTKCallback(r.Context(), tenantID, cb); err != nil {
			slog.ErrorContext(r.Context(), "stk callback", "tenant_id", tenantID, "err", err)
			httpx.JSON(w, http.StatusInternalServerError, map[string]any{"ResultCode": 1, "ResultDesc": "Retry"})
			return
		}
		httpx.JSON(w, http.StatusOK, mpesa.Ack)
	})
	r.Post("/v1/mpesa/{slug}/{token}/c2b/validate", func(w http.ResponseWriter, r *http.Request) {
		if _, err := s.authorizeCallback(r.Context(), chi.URLParam(r, "slug"), chi.URLParam(r, "token"), s.ClientIP(r)); err != nil {
			httpx.Fail(w, r, err)
			return
		}
		// Accept every payment: unmatched ones go to the reconciliation queue.
		httpx.JSON(w, http.StatusOK, mpesa.Ack)
	})
	r.Post("/v1/mpesa/{slug}/{token}/c2b/confirm", func(w http.ResponseWriter, r *http.Request) {
		tenantID, err := s.authorizeCallback(r.Context(), chi.URLParam(r, "slug"), chi.URLParam(r, "token"), s.ClientIP(r))
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		var c mpesa.C2BConfirmation
		if err := json.NewDecoder(io.LimitReader(r.Body, 1<<16)).Decode(&c); err != nil || c.TransID == "" {
			slog.WarnContext(r.Context(), "bad c2b body", "err", err)
			httpx.JSON(w, http.StatusOK, mpesa.Ack)
			return
		}
		if err := s.HandleC2BConfirmation(r.Context(), tenantID, c); err != nil {
			slog.ErrorContext(r.Context(), "c2b confirmation", "tenant_id", tenantID, "err", err)
			httpx.JSON(w, http.StatusInternalServerError, map[string]any{"ResultCode": 1, "ResultDesc": "Retry"})
			return
		}
		httpx.JSON(w, http.StatusOK, mpesa.Ack)
	})
}
