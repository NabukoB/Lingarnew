package mpesa

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

func fakeDaraja(t *testing.T, tokenCalls *int32, stk func(body map[string]any) (int, any)) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/oauth/v1/generate":
			u, p, _ := r.BasicAuth()
			if u != "key" || p != "secret" {
				w.WriteHeader(400)
				_, _ = w.Write([]byte(`{"errorCode":"400.008.01","errorMessage":"Invalid Authentication passed"}`))
				return
			}
			atomic.AddInt32(tokenCalls, 1)
			_, _ = w.Write([]byte(`{"access_token":"tok","expires_in":"3599"}`))
		case "/mpesa/stkpush/v1/processrequest", "/mpesa/stkpushquery/v1/query":
			if r.Header.Get("Authorization") != "Bearer tok" {
				w.WriteHeader(401)
				return
			}
			var body map[string]any
			_ = json.NewDecoder(r.Body).Decode(&body)
			status, out := stk(body)
			w.WriteHeader(status)
			_ = json.NewEncoder(w).Encode(out)
		default:
			w.WriteHeader(404)
		}
	}))
}

func TestSTKPushBuildsRequestAndCachesToken(t *testing.T) {
	var tokens int32
	var got map[string]any
	srv := fakeDaraja(t, &tokens, func(b map[string]any) (int, any) {
		got = b
		return 200, map[string]string{"MerchantRequestID": "m1", "CheckoutRequestID": "ws_CO_1", "ResponseCode": "0", "CustomerMessage": "Success"}
	})
	defer srv.Close()
	c := NewClient()
	fixed := time.Date(2026, 9, 25, 11, 30, 22, 0, time.UTC) // 14:30:22 EAT
	c.Now = func() time.Time { return fixed }
	cr := Credentials{BaseURL: srv.URL, ConsumerKey: "key", ConsumerSecret: "secret", Passkey: "pk", BusinessShortCode: "600100", PartyB: "600200", Till: true}

	for i := 0; i < 2; i++ {
		res, err := c.STKPush(context.Background(), cr, STKRequest{AmountKES: 60, Phone: "254712345678", CallbackURL: "https://x/cb", AccountReference: "PURCHASE-TOO-LONG-REF", Description: "Hotspot 1 day package"})
		if err != nil || res.CheckoutRequestID != "ws_CO_1" {
			t.Fatalf("STKPush: %+v %v", res, err)
		}
	}
	if tokens != 1 {
		t.Fatalf("token fetched %d times, want 1 (cached)", tokens)
	}
	if got["Timestamp"] != "20260925143022" {
		t.Fatalf("timestamp %v (must be Nairobi time)", got["Timestamp"])
	}
	wantPw := base64.StdEncoding.EncodeToString([]byte("600100pk20260925143022"))
	if got["Password"] != wantPw || got["TransactionType"] != "CustomerBuyGoodsOnline" || got["PartyB"] != "600200" {
		t.Fatalf("request %+v", got)
	}
	if got["AccountReference"] != "PURCHASE-TOO" || got["TransactionDesc"] != "Hotspot 1 day" {
		t.Fatalf("truncation: %v / %v", got["AccountReference"], got["TransactionDesc"])
	}
}

func TestSTKQueryPendingAndErrors(t *testing.T) {
	var tokens int32
	calls := 0
	srv := fakeDaraja(t, &tokens, func(b map[string]any) (int, any) {
		calls++
		if calls == 1 {
			return 500, map[string]string{"errorCode": "500.001.1001", "errorMessage": "The transaction is being processed"}
		}
		return 200, map[string]string{"ResultCode": "1032", "ResultDesc": "Request cancelled by user"}
	})
	defer srv.Close()
	c := NewClient()
	cr := Credentials{BaseURL: srv.URL, ConsumerKey: "key", ConsumerSecret: "secret", Passkey: "pk", BusinessShortCode: "174379", PartyB: "174379"}
	r, err := c.STKQuery(context.Background(), cr, "ws_CO_1")
	if err != nil || !r.Pending {
		t.Fatalf("first query: %+v %v", r, err)
	}
	r, err = c.STKQuery(context.Background(), cr, "ws_CO_1")
	if err != nil || r.ResultCode != 1032 {
		t.Fatalf("second query: %+v %v", r, err)
	}
	bad := cr
	bad.ConsumerSecret = "nope"
	bad.ConsumerKey = "other"
	if _, err := c.Token(context.Background(), bad); err == nil {
		t.Fatal("bad credentials accepted")
	}
}

func TestCallbackParsing(t *testing.T) {
	raw := `{"Body":{"stkCallback":{"MerchantRequestID":"m","CheckoutRequestID":"ws","ResultCode":0,"ResultDesc":"ok",
	  "CallbackMetadata":{"Item":[{"Name":"Amount","Value":60},{"Name":"MpesaReceiptNumber","Value":"RKT8765432"},
	  {"Name":"TransactionDate","Value":20260925143055},{"Name":"PhoneNumber","Value":254712345678}]}}}}`
	var cb STKCallback
	if err := json.Unmarshal([]byte(raw), &cb); err != nil {
		t.Fatal(err)
	}
	amt, receipt, phone := cb.Metadata()
	if amt != 60 || receipt != "RKT8765432" || phone != "254712345678" {
		t.Fatalf("metadata %v %v %v", amt, receipt, phone)
	}
	var failed STKCallback
	_ = json.Unmarshal([]byte(`{"Body":{"stkCallback":{"ResultCode":1032,"ResultDesc":"cancelled"}}}`), &failed)
	if a, r, _ := failed.Metadata(); a != 0 || r != "" {
		t.Fatal("failure callback should have no metadata")
	}
	if (C2BConfirmation{TransAmount: "1500.00"}).AmountCents() != 150000 {
		t.Fatal("C2B amount")
	}
	if StatusForResult(0) != "success" || StatusForResult(1037) != "expired" || StatusForResult(1032) != "failed" {
		t.Fatal("status mapping")
	}
}
