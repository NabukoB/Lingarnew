// Package sms sends SMS through Africa's Talking and charges the WISP's
// prepaid SMS credits (1 credit per 160-character part).
package sms

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/db"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
)

// Provider delivers one message.
type Provider interface {
	Send(ctx context.Context, to, body, sender string) (providerID string, err error)
}

// Parts returns how many SMS parts (credits) a message costs.
func Parts(body string) int {
	gsm := true
	for _, r := range body {
		if r > 127 {
			gsm = false
			break
		}
	}
	n := utf8.RuneCountInString(body)
	single, multi := 160, 153
	if !gsm {
		single, multi = 70, 67
	}
	if n <= single {
		return 1
	}
	return (n + multi - 1) / multi
}

type Service struct {
	DB       *db.DB
	Provider Provider
	Sender   string // platform default sender ID
}

// Result says what happened to a message.
type Result string

const (
	Sent       Result = "sent"
	NoCredit   Result = "skipped_no_credit"
	SendFailed Result = "failed"
)

// Send charges credits, delivers, and logs the message. A failed delivery is refunded.
func (s *Service) Send(ctx context.Context, tenantID uuid.UUID, to, body, kind string) (Result, error) {
	credits := int32(Parts(body))
	var sender string
	charged := false
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		t, err := q.GetTenant(ctx)
		if err != nil {
			return err
		}
		sender = s.Sender
		if t.SmsSender != nil {
			sender = *t.SmsSender
		}
		_, err = q.TakeSMSCredits(ctx, credits)
		if db.IsNotFound(err) {
			return q.InsertSMS(ctx, store.InsertSMSParams{ToNumber: to, Body: body, Kind: kind, Status: string(NoCredit)})
		}
		if err != nil {
			return err
		}
		charged = true
		return nil
	})
	if err != nil {
		return SendFailed, err
	}
	if !charged {
		return NoCredit, nil
	}

	id, sendErr := s.Provider.Send(ctx, to, body, sender)
	status := Sent
	var errMsg *string
	if sendErr != nil {
		status = SendFailed
		m := sendErr.Error()
		errMsg = &m
	}
	err = s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		if status == SendFailed {
			if _, err := q.AddSMSCredits(ctx, credits); err != nil {
				return err
			}
		}
		var pid *string
		if id != "" {
			pid = &id
		}
		used := credits
		if status == SendFailed {
			used = 0
		}
		return q.InsertSMS(ctx, store.InsertSMSParams{ToNumber: to, Body: body, Kind: kind, Status: string(status), Credits: used, ProviderID: pid, ErrorMessage: errMsg})
	})
	if err != nil {
		return status, err
	}
	return status, sendErr
}

// ─── Africa's Talking ──────────────────────────────────

type AfricasTalking struct {
	Username string
	APIKey   string
	BaseURL  string // defaults by sandbox/production
	HTTP     *http.Client
}

func NewAfricasTalking(username, apiKey string) *AfricasTalking {
	base := "https://api.africastalking.com"
	if username == "sandbox" {
		base = "https://api.sandbox.africastalking.com"
	}
	return &AfricasTalking{Username: username, APIKey: apiKey, BaseURL: base, HTTP: &http.Client{Timeout: 15 * time.Second}}
}

func (a *AfricasTalking) Send(ctx context.Context, to, body, sender string) (string, error) {
	if !strings.HasPrefix(to, "+") {
		to = "+" + to
	}
	form := url.Values{"username": {a.Username}, "to": {to}, "message": {body}}
	if sender != "" {
		form.Set("from", sender)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, a.BaseURL+"/version1/messaging", strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("apiKey", a.APIKey)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := a.HTTP.Do(req)
	if err != nil {
		return "", fmt.Errorf("could not reach Africa's Talking: %w", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("Africa's Talking %d: %s", resp.StatusCode, strings.TrimSpace(string(raw)))
	}
	var out struct {
		SMSMessageData struct {
			Recipients []struct {
				Status     string `json:"status"`
				StatusCode int    `json:"statusCode"`
				MessageID  string `json:"messageId"`
			} `json:"Recipients"`
			Message string `json:"Message"`
		} `json:"SMSMessageData"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", fmt.Errorf("unexpected Africa's Talking response: %w", err)
	}
	if len(out.SMSMessageData.Recipients) == 0 {
		return "", fmt.Errorf("Africa's Talking rejected the message: %s", out.SMSMessageData.Message)
	}
	r := out.SMSMessageData.Recipients[0]
	if r.StatusCode != 100 && r.StatusCode != 101 && r.StatusCode != 102 {
		return r.MessageID, fmt.Errorf("Africa's Talking could not deliver to %s: %s", to, r.Status)
	}
	return r.MessageID, nil
}

// LogProvider writes messages to the log instead of sending (development).
type LogProvider struct{}

func (LogProvider) Send(ctx context.Context, to, body, sender string) (string, error) {
	slog.InfoContext(ctx, "sms (not sent: no AT_API_KEY)", "to", to, "sender", sender, "body", body)
	return "log-" + uuid.NewString()[:8], nil
}

// Render fills {placeholders} in a template.
func Render(tmpl string, vars map[string]string) string {
	out := tmpl
	for k, v := range vars {
		out = strings.ReplaceAll(out, "{"+k+"}", v)
	}
	return out
}
