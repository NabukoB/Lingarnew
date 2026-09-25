package sms

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil/fixtures"
)

func TestParts(t *testing.T) {
	cases := map[string]int{
		strings.Repeat("a", 160): 1,
		strings.Repeat("a", 161): 2,
		strings.Repeat("a", 306): 2,
		strings.Repeat("a", 307): 3,
		"Asante ✓":               1,
		strings.Repeat("é", 71):  2,
	}
	for body, want := range cases {
		if got := Parts(body); got != want {
			t.Errorf("Parts(len %d) = %d, want %d", len(body), got, want)
		}
	}
}

func TestRender(t *testing.T) {
	got := Render("Your {business} package ({package}) has expired: {link}", map[string]string{"business": "Jazmoge", "package": "1 day", "link": "x.co"})
	if got != "Your Jazmoge package (1 day) has expired: x.co" {
		t.Fatal(got)
	}
}

func TestAfricasTalking(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		if r.Header.Get("apiKey") != "k" || r.Form.Get("to") != "+254712345678" || r.Form.Get("from") != "JAZMOGE" {
			w.WriteHeader(401)
			return
		}
		_, _ = w.Write([]byte(`{"SMSMessageData":{"Message":"Sent to 1/1","Recipients":[{"statusCode":101,"status":"Success","messageId":"ATX1"}]}}`))
	}))
	defer srv.Close()
	at := NewAfricasTalking("sandbox", "k")
	at.BaseURL = srv.URL
	id, err := at.Send(context.Background(), "254712345678", "hi", "JAZMOGE")
	if err != nil || id != "ATX1" {
		t.Fatalf("send: %q %v", id, err)
	}
	at.APIKey = "wrong"
	if _, err := at.Send(context.Background(), "254712345678", "hi", "JAZMOGE"); err == nil {
		t.Fatal("expected auth error")
	}
}

type fakeProvider struct {
	sent []string
	err  error
}

func (f *fakeProvider) Send(_ context.Context, to, body, _ string) (string, error) {
	if f.err != nil {
		return "", f.err
	}
	f.sent = append(f.sent, to+":"+body)
	return "id", nil
}

func TestServiceChargesCreditsAndRefundsFailures(t *testing.T) {
	d := testutil.DB(t)
	tn := fixtures.Tenant(t, d, testutil.Sealer(t), "SMS Net")
	ctx := context.Background()
	p := &fakeProvider{}
	s := &Service{DB: d, Provider: p}

	res, err := s.Send(ctx, tn.ID, "254712345678", "hello", "test")
	if err != nil || res != NoCredit || len(p.sent) != 0 {
		t.Fatalf("no credits: %v %v %v", res, err, p.sent)
	}
	_ = d.WithTenant(ctx, tn.ID, func(q *store.Queries) error { _, err := q.AddSMSCredits(ctx, 2); return err })
	if res, err = s.Send(ctx, tn.ID, "254712345678", "hello", "test"); err != nil || res != Sent {
		t.Fatalf("send: %v %v", res, err)
	}
	p.err = errors.New("network down")
	if res, _ = s.Send(ctx, tn.ID, "254712345678", "hello", "test"); res != SendFailed {
		t.Fatalf("failed send: %v", res)
	}
	var credits int32
	var logs []store.SmsMessage
	_ = d.WithTenant(ctx, tn.ID, func(q *store.Queries) error {
		tt, _ := q.GetTenant(ctx)
		credits = tt.SmsCredits
		logs, _ = q.ListSMS(ctx, 10)
		return nil
	})
	if credits != 1 {
		t.Fatalf("credits = %d, want 1 (one used, failure refunded)", credits)
	}
	if len(logs) != 3 {
		t.Fatalf("logged %d messages, want 3", len(logs))
	}
}
