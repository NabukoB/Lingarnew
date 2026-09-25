package billing

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/netip"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/nabukob/lingarnew/wisp-saas/internal/auth"
	"github.com/nabukob/lingarnew/wisp-saas/internal/customers"
	"github.com/nabukob/lingarnew/wisp-saas/internal/mpesa"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/config"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/sms"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
	"github.com/nabukob/lingarnew/wisp-saas/internal/tenant"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil/fixtures"
)

type fakeDaraja struct {
	mu      sync.Mutex
	n       int
	pushes  []mpesa.STKRequest
	creds   []mpesa.Credentials
	query   mpesa.QueryResult
	pushErr error
}

func (f *fakeDaraja) STKPush(_ context.Context, cr mpesa.Credentials, r mpesa.STKRequest) (mpesa.STKResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.pushErr != nil {
		return mpesa.STKResponse{}, f.pushErr
	}
	f.n++
	f.pushes = append(f.pushes, r)
	f.creds = append(f.creds, cr)
	return mpesa.STKResponse{MerchantRequestID: "m-" + uuid.NewString(), CheckoutRequestID: fmt.Sprintf("ws_CO_%s_%d", uuid.NewString()[:6], f.n), ResponseCode: "0"}, nil
}

func (f *fakeDaraja) STKQuery(context.Context, mpesa.Credentials, string) (mpesa.QueryResult, error) {
	return f.query, nil
}

func (f *fakeDaraja) RegisterC2BURLs(context.Context, mpesa.Credentials, string, string) error {
	return nil
}

type smsLog struct {
	mu   sync.Mutex
	msgs []string
}

func (l *smsLog) Send(_ context.Context, to, body, _ string) (string, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.msgs = append(l.msgs, to+": "+body)
	return "x", nil
}

type env struct {
	s      *Service
	fd     *fakeDaraja
	sms    *smsLog
	cust   *customers.Service
	tenant store.Tenant
	now    time.Time
}

func setup(t *testing.T) *env {
	d := testutil.DB(t)
	sealer := testutil.Sealer(t)
	tn := fixtures.Tenant(t, d, sealer, "Pay Net")
	e := &env{fd: &fakeDaraja{}, sms: &smsLog{}, tenant: tn, now: time.Now()}
	cfg := config.Config{PublicAPIURL: "https://api.test", MpesaEnv: "sandbox", MpesaConsumerKey: "ck", MpesaConsumerSecret: "cs",
		MpesaPasskey: "pk", MpesaShortcode: "174379", SubscriptionPrice: 150000, SMSCreditPrice: 100}
	e.s = &Service{DB: d, Tenants: &tenant.Service{DB: d, Sealer: sealer, Auth: &auth.Service{DB: d, TTL: time.Hour}}, Daraja: e.fd,
		Cfg: cfg, SMS: &sms.Service{DB: d, Provider: e.sms}, Now: func() time.Time { return e.now }, CallbackWait: 300 * time.Millisecond}
	e.cust = &customers.Service{DB: d, Sealer: sealer, Now: func() time.Time { return e.now }}
	_ = d.WithTenant(context.Background(), tn.ID, func(q *store.Queries) error { _, err := q.AddSMSCredits(context.Background(), 50); return err })
	return e
}

func callback(t *testing.T, checkout string, code int, amountKES int, receipt string) mpesa.STKCallback {
	t.Helper()
	meta := ""
	if code == 0 {
		meta = fmt.Sprintf(`,"CallbackMetadata":{"Item":[{"Name":"Amount","Value":%d},{"Name":"MpesaReceiptNumber","Value":%q},{"Name":"PhoneNumber","Value":254712345678}]}`, amountKES, receipt)
	}
	raw := fmt.Sprintf(`{"Body":{"stkCallback":{"MerchantRequestID":"m","CheckoutRequestID":%q,"ResultCode":%d,"ResultDesc":"desc"%s}}}`, checkout, code, meta)
	var cb mpesa.STKCallback
	if err := json.Unmarshal([]byte(raw), &cb); err != nil {
		t.Fatal(err)
	}
	return cb
}

func receipt() string {
	return "R" + strings.ToUpper(strings.ReplaceAll(uuid.NewString(), "-", "")[:9])
}

func (e *env) subscriber(t *testing.T, startNow bool) store.Subscriber {
	t.Helper()
	plan := fixtures.Plan(t, e.s.DB, e.tenant.ID, "pppoe", "Bronze 5 Mbps")
	sub, _, err := e.cust.CreateSubscriber(context.Background(), e.tenant.ID, customers.SubscriberInput{FullName: "Mary W", Phone: "0712345678", PlanID: &plan.ID, StartNow: startNow})
	if err != nil {
		t.Fatal(err)
	}
	return sub
}

func (e *env) get(t *testing.T, id uuid.UUID) store.Subscriber {
	t.Helper()
	sub, err := e.cust.GetSubscriber(context.Background(), e.tenant.ID, id)
	if err != nil {
		t.Fatal(err)
	}
	return sub
}

func TestPPPoEPaymentRenewsOnceEvenWithDuplicateCallbacks(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	sub := e.subscriber(t, false)

	tx, err := e.s.ChargeSubscriber(ctx, e.tenant.ID, sub.ID, "", 0)
	if err != nil {
		t.Fatal(err)
	}
	push := e.fd.pushes[0]
	if push.AmountKES != 1500 || push.AccountReference != sub.PppoeUsername || push.CallbackURL != "https://api.test/v1/mpesa/"+e.tenant.Slug+"/"+e.tenant.CallbackToken+"/stk" {
		t.Fatalf("push %+v", push)
	}
	if cr := e.fd.creds[0]; cr.PartyB != "123456" || cr.Till || cr.ConsumerKey != "ck" {
		t.Fatalf("platform-mode Paybill credentials %+v", cr)
	}

	rc := receipt()
	for i := 0; i < 3; i++ {
		if err := e.s.HandleSTKCallback(ctx, e.tenant.ID, callback(t, *tx.CheckoutRequestID, 0, 1500, rc)); err != nil {
			t.Fatal(err)
		}
	}
	got := e.get(t, sub.ID)
	want := e.now.Add(30 * 24 * time.Hour)
	if got.Status != "active" || got.NextRenewalAt.Sub(want).Abs() > time.Minute || got.CreditCents != 0 {
		t.Fatalf("after payment: status %s renew %v credit %d", got.Status, got.NextRenewalAt, got.CreditCents)
	}
	if len(e.sms.msgs) != 1 || !strings.Contains(e.sms.msgs[0], rc) || !strings.Contains(e.sms.msgs[0], "paid until") {
		t.Fatalf("receipt sms %v", e.sms.msgs)
	}
}

func TestPartialPaymentsAccumulateAsCredit(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	sub := e.subscriber(t, true)
	renew := *sub.NextRenewalAt

	tx, err := e.s.ChargeSubscriber(ctx, e.tenant.ID, sub.ID, "", 1000)
	if err != nil {
		t.Fatal(err)
	}
	_ = e.s.HandleSTKCallback(ctx, e.tenant.ID, callback(t, *tx.CheckoutRequestID, 0, 1000, receipt()))
	got := e.get(t, sub.ID)
	if got.CreditCents != 100000 || !got.NextRenewalAt.Equal(renew) {
		t.Fatalf("partial: credit %d renew %v", got.CreditCents, got.NextRenewalAt)
	}
	if !strings.Contains(e.sms.msgs[len(e.sms.msgs)-1], "Pay KSh 500 more") {
		t.Fatalf("partial sms %v", e.sms.msgs)
	}
	tx, _ = e.s.ChargeSubscriber(ctx, e.tenant.ID, sub.ID, "", 0) // charges 500 (price - credit)
	if e.fd.pushes[len(e.fd.pushes)-1].AmountKES != 500 {
		t.Fatalf("second charge %d", e.fd.pushes[len(e.fd.pushes)-1].AmountKES)
	}
	_ = e.s.HandleSTKCallback(ctx, e.tenant.ID, callback(t, *tx.CheckoutRequestID, 0, 700, receipt()))
	got = e.get(t, sub.ID)
	if got.CreditCents != 20000 || got.NextRenewalAt.Sub(renew.Add(30*24*time.Hour)).Abs() > time.Second {
		t.Fatalf("completed: credit %d renew %v (extends from the old date)", got.CreditCents, got.NextRenewalAt)
	}
}

func TestFailedAndSweptPayments(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	sub := e.subscriber(t, false)
	tx, _ := e.s.ChargeSubscriber(ctx, e.tenant.ID, sub.ID, "", 0)
	_ = e.s.HandleSTKCallback(ctx, e.tenant.ID, callback(t, *tx.CheckoutRequestID, 1032, 0, ""))
	if got := e.get(t, sub.ID); got.Status != "expired" {
		t.Fatalf("cancelled payment changed status to %s", got.Status)
	}

	// No callback: the sweeper asks Safaricom after 60s.
	tx2, _ := e.s.ChargeSubscriber(ctx, e.tenant.ID, sub.ID, "", 0)
	e.fd.query = mpesa.QueryResult{Pending: true}
	e.now = time.Now().Add(2 * time.Minute)
	_ = e.s.SweepPending(ctx)
	e.fd.query = mpesa.QueryResult{ResultCode: 0}
	_ = e.s.SweepPending(ctx)
	if got := e.get(t, sub.ID); got.Status != "active" {
		t.Fatalf("swept payment not applied: %s", got.Status)
	}
	// A late callback now only fills in the receipt; no second renewal.
	renew := *e.get(t, sub.ID).NextRenewalAt
	rc := receipt()
	_ = e.s.HandleSTKCallback(ctx, e.tenant.ID, callback(t, *tx2.CheckoutRequestID, 0, 1500, rc))
	if got := e.get(t, sub.ID); !got.NextRenewalAt.Equal(renew) {
		t.Fatal("late callback renewed twice")
	}
	var saved store.MpesaTransaction
	_ = e.s.DB.WithTenant(ctx, e.tenant.ID, func(q *store.Queries) error { saved, _ = q.GetTx(ctx, tx2.ID); return nil })
	if saved.MpesaReceiptNumber == nil || *saved.MpesaReceiptNumber != rc {
		t.Fatalf("receipt not filled in: %v", saved.MpesaReceiptNumber)
	}

	// Pending with no answer for 5 minutes → expired.
	tx3, _ := e.s.ChargeSubscriber(ctx, e.tenant.ID, sub.ID, "", 0)
	e.fd.query = mpesa.QueryResult{Pending: true}
	e.now = time.Now().Add(10 * time.Minute)
	_ = e.s.SweepPending(ctx)
	_ = e.s.DB.WithTenant(ctx, e.tenant.ID, func(q *store.Queries) error { saved, _ = q.GetTx(ctx, tx3.ID); return nil })
	if saved.Status != "expired" {
		t.Fatalf("stale payment status %s", saved.Status)
	}
}

func TestHotspotPurchaseReconnectAndLimits(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	day := fixtures.Plan(t, e.s.DB, e.tenant.ID, "hotspot", "1 day") // max 2 devices
	p, err := e.s.BuyHotspot(ctx, e.tenant.ID, day.ID, "0712 345 678", "aa-bb-cc-dd-ee-01", nil)
	if err != nil {
		t.Fatal(err)
	}
	if e.fd.pushes[0].AmountKES != 60 || !strings.HasPrefix(e.fd.pushes[0].AccountReference, "HS") {
		t.Fatalf("hotspot push %+v", e.fd.pushes[0])
	}
	st, _ := e.s.PurchaseStatus(ctx, e.tenant.ID, p.ID, "AA:BB:CC:DD:EE:01")
	if st.State != "pending" {
		t.Fatalf("state %s", st.State)
	}
	var tx store.MpesaTransaction
	_ = e.s.DB.WithTenant(ctx, e.tenant.ID, func(q *store.Queries) error { tx, _ = q.LatestTxForPurchase(ctx, &p.ID); return nil })
	rc := receipt()
	_ = e.s.HandleSTKCallback(ctx, e.tenant.ID, callback(t, *tx.CheckoutRequestID, 0, 60, rc))
	st, _ = e.s.PurchaseStatus(ctx, e.tenant.ID, p.ID, "AA:BB:CC:DD:EE:01")
	if st.State != "active" || st.LoginUser != "AA:BB:CC:DD:EE:01" || st.Receipt == nil || *st.Receipt != rc {
		t.Fatalf("active state %+v", st)
	}
	if _, err := e.s.Reconnect(ctx, e.tenant.ID, strings.ToLower(rc), "AA:BB:CC:DD:EE:02"); err != nil {
		t.Fatalf("second device: %v", err)
	}
	if _, err := e.s.Reconnect(ctx, e.tenant.ID, rc, "AA:BB:CC:DD:EE:02"); err != nil {
		t.Fatalf("same device again should be fine: %v", err)
	}
	_, err = e.s.Reconnect(ctx, e.tenant.ID, rc, "AA:BB:CC:DD:EE:03")
	var he *httpx.Error
	if !errors.As(err, &he) || he.Code != "DEVICE_LIMIT" || !strings.Contains(he.Message, "2 of 2") {
		t.Fatalf("third device: %v", err)
	}
	if _, err := e.s.Reconnect(ctx, e.tenant.ID, "ZZZ0000000", "AA:BB:CC:DD:EE:03"); !errors.As(err, &he) || he.Code != "CODE_NOT_FOUND" {
		t.Fatalf("unknown code: %v", err)
	}

	// A failed purchase says why.
	p2, _ := e.s.BuyHotspot(ctx, e.tenant.ID, day.ID, "0712345678", "AA:BB:CC:DD:EE:09", nil)
	_ = e.s.DB.WithTenant(ctx, e.tenant.ID, func(q *store.Queries) error { tx, _ = q.LatestTxForPurchase(ctx, &p2.ID); return nil })
	_ = e.s.HandleSTKCallback(ctx, e.tenant.ID, callback(t, *tx.CheckoutRequestID, 2001, 0, ""))
	st, _ = e.s.PurchaseStatus(ctx, e.tenant.ID, p2.ID, "")
	if st.State != "failed" || !strings.Contains(st.Message, "PIN") {
		t.Fatalf("failed state %+v", st)
	}

	if _, err := e.s.BuyHotspot(ctx, e.tenant.ID, day.ID, "0712345678", "not-a-mac", nil); !errors.As(err, &he) || he.Code != "DEVICE_UNKNOWN" {
		t.Fatalf("bad mac: %v", err)
	}
}

func TestVoucherAndTrial(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	day := fixtures.Plan(t, e.s.DB, e.tenant.ID, "hotspot", "1 day")
	vs, err := e.cust.CreateVouchers(ctx, e.tenant.ID, day.ID, 1, "")
	if err != nil {
		t.Fatal(err)
	}
	p, err := e.s.RedeemVoucher(ctx, e.tenant.ID, strings.ToLower(vs[0].Code), "AA:BB:CC:00:00:01", nil)
	if err != nil || p.ExpiresAt == nil {
		t.Fatalf("redeem: %v", err)
	}
	var he *httpx.Error
	if _, err := e.s.RedeemVoucher(ctx, e.tenant.ID, vs[0].Code, "AA:BB:CC:00:00:02", nil); !errors.As(err, &he) || he.Code != "VOUCHER_USED" {
		t.Fatalf("reuse: %v", err)
	}

	if _, err := e.s.StartTrial(ctx, e.tenant.ID, "AA:BB:CC:00:00:03", nil); !errors.As(err, &he) || he.Code != "NO_TRIAL" {
		t.Fatalf("no trial plan: %v", err)
	}
	mins := int32(15)
	if _, err := e.cust.CreatePlan(ctx, e.tenant.ID, customers.PlanInput{Name: "Free", AccessType: "hotspot", IsTrial: true, DurationMinutes: &mins, BandwidthDownKbps: 1000, BandwidthUpKbps: 500}); err != nil {
		t.Fatal(err)
	}
	if _, err := e.s.StartTrial(ctx, e.tenant.ID, "AA:BB:CC:00:00:03", nil); err != nil {
		t.Fatalf("trial: %v", err)
	}
	if _, err := e.s.StartTrial(ctx, e.tenant.ID, "AA:BB:CC:00:00:03", nil); !errors.As(err, &he) || he.Code != "TRIAL_USED" {
		t.Fatalf("second trial: %v", err)
	}
}

func TestC2BMatchingAndReconciliation(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	sub := e.subscriber(t, false)
	typed := strings.ToLower(sub.PppoeUsername[:3]) + " " + sub.PppoeUsername[3:]
	c := mpesa.C2BConfirmation{TransID: receipt(), TransAmount: "1500.00", BillRefNumber: typed, MSISDN: "254712345678"}
	for i := 0; i < 2; i++ { // duplicate delivery is ignored
		if err := e.s.HandleC2BConfirmation(ctx, e.tenant.ID, c); err != nil {
			t.Fatal(err)
		}
	}
	got := e.get(t, sub.ID)
	if got.Status != "active" || got.NextRenewalAt.Sub(e.now.Add(30*24*time.Hour)).Abs() > time.Minute {
		t.Fatalf("c2b not applied once: %s %v", got.Status, got.NextRenewalAt)
	}

	other := e.subscriber(t, false)
	un := mpesa.C2BConfirmation{TransID: receipt(), TransAmount: "1500", BillRefNumber: "JOHN"}
	_ = e.s.HandleC2BConfirmation(ctx, e.tenant.ID, un)
	var rows []store.ListPaymentsRow
	unmatched := "unmatched"
	_ = e.s.DB.WithTenant(ctx, e.tenant.ID, func(q *store.Queries) error {
		rows, _ = q.ListPayments(ctx, store.ListPaymentsParams{Limit: 10, Status: &unmatched})
		return nil
	})
	if len(rows) != 1 || rows[0].AccountReference != "JOHN" {
		t.Fatalf("unmatched queue %+v", rows)
	}
	if err := e.s.MatchPayment(ctx, e.tenant.ID, rows[0].ID, other.ID); err != nil {
		t.Fatal(err)
	}
	if got := e.get(t, other.ID); got.Status != "active" {
		t.Fatalf("matched payment not applied: %s", got.Status)
	}
	if err := e.s.MatchPayment(ctx, e.tenant.ID, rows[0].ID, other.ID); err == nil {
		t.Fatal("matched twice")
	}
}

func TestCallbackAuthorization(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	if _, err := e.s.authorizeCallback(ctx, e.tenant.Slug, e.tenant.CallbackToken, "1.2.3.4"); err != nil {
		t.Fatalf("valid callback rejected: %v", err)
	}
	if _, err := e.s.authorizeCallback(ctx, e.tenant.Slug, "wrong", "1.2.3.4"); err == nil {
		t.Fatal("wrong token accepted")
	}
	if _, err := e.s.authorizeCallback(ctx, "no-such-isp", e.tenant.CallbackToken, "1.2.3.4"); err == nil {
		t.Fatal("unknown slug accepted")
	}
	e.s.Cfg.MpesaAllowedIPs = []netip.Prefix{netip.MustParsePrefix("196.201.214.0/24")}
	if _, err := e.s.authorizeCallback(ctx, e.tenant.Slug, e.tenant.CallbackToken, "1.2.3.4"); err == nil {
		t.Fatal("IP outside allowlist accepted")
	}
	if _, err := e.s.authorizeCallback(ctx, e.tenant.Slug, e.tenant.CallbackToken, "196.201.214.200"); err != nil {
		t.Fatalf("allowlisted IP rejected: %v", err)
	}
}

func TestPlatformSubscriptionAndSMSCredits(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	tx, err := e.s.PaySubscription(ctx, e.tenant.ID, "0712345678", 2)
	if err != nil {
		t.Fatal(err)
	}
	if cr := e.fd.creds[len(e.fd.creds)-1]; cr.PartyB != "174379" {
		t.Fatalf("subscription must go to the platform shortcode, got %s", cr.PartyB)
	}
	_ = e.s.HandleSTKCallback(ctx, e.tenant.ID, callback(t, *tx.CheckoutRequestID, 0, 3000, receipt()))
	tn, _ := e.s.Tenants.Get(ctx, e.tenant.ID)
	want := e.tenant.TrialEndsAt.AddDate(0, 2, 0)
	if tn.SubscriptionStatus != "active" || tn.SubscriptionExpiresAt.Sub(want).Abs() > time.Minute {
		t.Fatalf("subscription %s %v want %v", tn.SubscriptionStatus, tn.SubscriptionExpiresAt, want)
	}
	before := tn.SmsCredits
	tx, _ = e.s.BuySMSCredits(ctx, e.tenant.ID, "0712345678", 100)
	_ = e.s.HandleSTKCallback(ctx, e.tenant.ID, callback(t, *tx.CheckoutRequestID, 0, 100, receipt()))
	tn, _ = e.s.Tenants.Get(ctx, e.tenant.ID)
	if tn.SmsCredits != before+100 {
		t.Fatalf("sms credits %d, want %d", tn.SmsCredits, before+100)
	}
}

func TestNormalizeMAC(t *testing.T) {
	cases := map[string]string{"aa-bb-cc-dd-ee-ff": "AA:BB:CC:DD:EE:FF", "aabbccddeeff": "AA:BB:CC:DD:EE:FF", "AA:BB:CC:DD:EE": ""}
	for in, want := range cases {
		if got := NormalizeMAC(in); got != want {
			t.Errorf("NormalizeMAC(%q) = %q", in, got)
		}
	}
}
