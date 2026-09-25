// Package mpesa is a client for Safaricom's Daraja API: OAuth, STK Push,
// STK Query and C2B URL registration, plus the callback payload types.
package mpesa

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	SandboxURL    = "https://sandbox.safaricom.co.ke"
	ProductionURL = "https://api.safaricom.co.ke"
)

func BaseURL(env string) string {
	if env == "production" {
		return ProductionURL
	}
	return SandboxURL
}

var nairobi = func() *time.Location {
	l, err := time.LoadLocation("Africa/Nairobi")
	if err != nil {
		return time.FixedZone("EAT", 3*3600)
	}
	return l
}()

// Credentials identify the Daraja app and the shortcode that receives the money.
type Credentials struct {
	BaseURL        string
	ConsumerKey    string
	ConsumerSecret string
	Passkey        string
	// BusinessShortCode is the Paybill, or for Buy Goods the store (head office) number.
	BusinessShortCode string
	// PartyB receives the money: the Paybill, or the Till number.
	PartyB string
	Till   bool
}

type Client struct {
	HTTP *http.Client
	Now  func() time.Time

	mu     sync.Mutex
	tokens map[string]cachedToken
}

type cachedToken struct {
	token   string
	expires time.Time
}

func NewClient() *Client {
	return &Client{HTTP: &http.Client{Timeout: 20 * time.Second}}
}

func (c *Client) now() time.Time {
	if c.Now != nil {
		return c.Now()
	}
	return time.Now()
}

// APIError is a non-success answer from Daraja.
type APIError struct {
	Status  int
	Code    string
	Message string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("daraja %d %s: %s", e.Status, e.Code, e.Message)
}

// Token returns a cached OAuth token (TTL = expires_in - 60s).
func (c *Client) Token(ctx context.Context, cr Credentials) (string, error) {
	key := cr.BaseURL + "|" + cr.ConsumerKey
	c.mu.Lock()
	if c.tokens == nil {
		c.tokens = map[string]cachedToken{}
	}
	if t, ok := c.tokens[key]; ok && c.now().Before(t.expires) {
		c.mu.Unlock()
		return t.token, nil
	}
	c.mu.Unlock()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, cr.BaseURL+"/oauth/v1/generate?grant_type=client_credentials", nil)
	if err != nil {
		return "", err
	}
	req.SetBasicAuth(cr.ConsumerKey, cr.ConsumerSecret)
	var out struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   string `json:"expires_in"`
	}
	if err := c.do(req, &out); err != nil {
		return "", fmt.Errorf("M-Pesa sign-in failed (check the consumer key and secret): %w", err)
	}
	secs, _ := strconv.Atoi(out.ExpiresIn)
	if secs <= 60 {
		secs = 3599
	}
	c.mu.Lock()
	c.tokens[key] = cachedToken{token: out.AccessToken, expires: c.now().Add(time.Duration(secs-60) * time.Second)}
	c.mu.Unlock()
	return out.AccessToken, nil
}

func (c *Client) timestampAndPassword(cr Credentials) (string, string) {
	ts := c.now().In(nairobi).Format("20060102150405")
	return ts, base64.StdEncoding.EncodeToString([]byte(cr.BusinessShortCode + cr.Passkey + ts))
}

type STKRequest struct {
	AmountKES        int64
	Phone            string // 2547…
	CallbackURL      string
	AccountReference string // max 12 chars
	Description      string // max 13 chars
}

type STKResponse struct {
	MerchantRequestID string `json:"MerchantRequestID"`
	CheckoutRequestID string `json:"CheckoutRequestID"`
	ResponseCode      string `json:"ResponseCode"`
	ResponseDesc      string `json:"ResponseDescription"`
	CustomerMessage   string `json:"CustomerMessage"`
}

func truncate(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}

// STKPush sends the PIN prompt to the customer's phone.
func (c *Client) STKPush(ctx context.Context, cr Credentials, r STKRequest) (STKResponse, error) {
	if r.AmountKES < 1 {
		return STKResponse{}, fmt.Errorf("amount must be at least KES 1")
	}
	token, err := c.Token(ctx, cr)
	if err != nil {
		return STKResponse{}, err
	}
	ts, pw := c.timestampAndPassword(cr)
	txType := "CustomerPayBillOnline"
	if cr.Till {
		txType = "CustomerBuyGoodsOnline"
	}
	body := map[string]any{
		"BusinessShortCode": cr.BusinessShortCode,
		"Password":          pw,
		"Timestamp":         ts,
		"TransactionType":   txType,
		"Amount":            r.AmountKES,
		"PartyA":            r.Phone,
		"PartyB":            cr.PartyB,
		"PhoneNumber":       r.Phone,
		"CallBackURL":       r.CallbackURL,
		"AccountReference":  truncate(r.AccountReference, 12),
		"TransactionDesc":   truncate(r.Description, 13),
	}
	var out STKResponse
	if err := c.post(ctx, cr.BaseURL+"/mpesa/stkpush/v1/processrequest", token, body, &out); err != nil {
		return out, err
	}
	if out.ResponseCode != "0" {
		return out, &APIError{Status: 200, Code: out.ResponseCode, Message: out.ResponseDesc}
	}
	return out, nil
}

// QueryResult is the answer to an STK status query.
type QueryResult struct {
	Pending    bool // Safaricom is still processing
	ResultCode int
	ResultDesc string
}

// STKQuery asks for the outcome of an STK Push.
func (c *Client) STKQuery(ctx context.Context, cr Credentials, checkoutID string) (QueryResult, error) {
	token, err := c.Token(ctx, cr)
	if err != nil {
		return QueryResult{}, err
	}
	ts, pw := c.timestampAndPassword(cr)
	var out struct {
		ResultCode string `json:"ResultCode"`
		ResultDesc string `json:"ResultDesc"`
	}
	err = c.post(ctx, cr.BaseURL+"/mpesa/stkpushquery/v1/query", token, map[string]any{
		"BusinessShortCode": cr.BusinessShortCode, "Password": pw, "Timestamp": ts, "CheckoutRequestID": checkoutID,
	}, &out)
	var apiErr *APIError
	if err != nil {
		// 500.001.1001 = "The transaction is being processed".
		if asAPI(err, &apiErr) && strings.Contains(apiErr.Code, "500.001.1001") {
			return QueryResult{Pending: true}, nil
		}
		return QueryResult{}, err
	}
	code, _ := strconv.Atoi(out.ResultCode)
	return QueryResult{ResultCode: code, ResultDesc: out.ResultDesc}, nil
}

// RegisterC2BURLs registers confirmation/validation URLs for a Paybill or Till.
func (c *Client) RegisterC2BURLs(ctx context.Context, cr Credentials, confirmURL, validateURL string) error {
	token, err := c.Token(ctx, cr)
	if err != nil {
		return err
	}
	var out map[string]any
	return c.post(ctx, cr.BaseURL+"/mpesa/c2b/v2/registerurl", token, map[string]any{
		"ShortCode": cr.PartyB, "ResponseType": "Completed", "ConfirmationURL": confirmURL, "ValidationURL": validateURL,
	}, &out)
}

func asAPI(err error, target **APIError) bool {
	e, ok := err.(*APIError)
	if ok {
		*target = e
	}
	return ok
}

func (c *Client) post(ctx context.Context, url, token string, body, out any) error {
	b, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(b))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	return c.do(req, out)
}

func (c *Client) do(req *http.Request, out any) error {
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return fmt.Errorf("could not reach Safaricom: %w", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode >= 300 {
		var e struct {
			ErrorCode    string `json:"errorCode"`
			ErrorMessage string `json:"errorMessage"`
		}
		_ = json.Unmarshal(raw, &e)
		if e.ErrorMessage == "" {
			e.ErrorMessage = strings.TrimSpace(string(raw))
		}
		return &APIError{Status: resp.StatusCode, Code: e.ErrorCode, Message: e.ErrorMessage}
	}
	if out == nil {
		return nil
	}
	if err := json.Unmarshal(raw, out); err != nil {
		return fmt.Errorf("unexpected Daraja response: %w", err)
	}
	return nil
}

// ─── Callbacks ─────────────────────────────────────────

// STKCallback is the body Safaricom posts to CallBackURL.
type STKCallback struct {
	Body struct {
		StkCallback struct {
			MerchantRequestID string `json:"MerchantRequestID"`
			CheckoutRequestID string `json:"CheckoutRequestID"`
			ResultCode        int    `json:"ResultCode"`
			ResultDesc        string `json:"ResultDesc"`
			CallbackMetadata  *struct {
				Item []struct {
					Name  string          `json:"Name"`
					Value json.RawMessage `json:"Value"`
				} `json:"Item"`
			} `json:"CallbackMetadata"`
		} `json:"stkCallback"`
	} `json:"Body"`
}

// Metadata extracts amount, receipt and phone. CallbackMetadata is absent on failure.
func (cb STKCallback) Metadata() (amountKES float64, receipt, phone string) {
	m := cb.Body.StkCallback.CallbackMetadata
	if m == nil {
		return 0, "", ""
	}
	for _, it := range m.Item {
		v := strings.Trim(string(it.Value), `"`)
		switch it.Name {
		case "Amount":
			amountKES, _ = strconv.ParseFloat(v, 64)
		case "MpesaReceiptNumber":
			receipt = v
		case "PhoneNumber":
			phone = v
		}
	}
	return
}

// C2BConfirmation is a manual Paybill/Till payment notification.
type C2BConfirmation struct {
	TransactionType   string `json:"TransactionType"`
	TransID           string `json:"TransID"`
	TransTime         string `json:"TransTime"`
	TransAmount       string `json:"TransAmount"`
	BusinessShortCode string `json:"BusinessShortCode"`
	BillRefNumber     string `json:"BillRefNumber"`
	MSISDN            string `json:"MSISDN"`
	FirstName         string `json:"FirstName"`
}

// AmountCents parses "1500.00" into 150000.
func (c C2BConfirmation) AmountCents() int64 {
	f, err := strconv.ParseFloat(strings.TrimSpace(c.TransAmount), 64)
	if err != nil {
		return 0
	}
	return int64(f*100 + 0.5)
}

// Ack is the reply Safaricom expects to every callback.
var Ack = map[string]any{"ResultCode": 0, "ResultDesc": "Accepted"}

// UserMessage turns an STK result code into a short message for the customer.
func UserMessage(code int) string {
	switch code {
	case 0:
		return "Payment received. You're online."
	case 1:
		return "Not enough M-Pesa balance. Top up and try again."
	case 1032:
		return "You cancelled the M-Pesa prompt. Tap Pay to try again."
	case 1037:
		return "We couldn't reach your phone. Make sure it's on and try again."
	case 2001:
		return "Wrong M-Pesa PIN. Try again."
	default:
		return "M-Pesa didn't complete the payment. Try again."
	}
}

// StatusForResult maps a result code to our transaction status.
func StatusForResult(code int) string {
	switch code {
	case 0:
		return "success"
	case 1037:
		return "expired"
	default:
		return "failed"
	}
}
