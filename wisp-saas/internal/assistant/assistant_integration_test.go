package assistant_test

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/anthropics/anthropic-sdk-go/option"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/nabukob/lingarnew/wisp-saas/internal/assistant"
	"github.com/nabukob/lingarnew/wisp-saas/internal/auth"
	"github.com/nabukob/lingarnew/wisp-saas/internal/billing"
	"github.com/nabukob/lingarnew/wisp-saas/internal/customers"
	"github.com/nabukob/lingarnew/wisp-saas/internal/dashboard"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/router"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil/fixtures"
)

// ── fake data ────────────────────────────────────────────────

var (
	ruiruID = uuid.MustParse("00000000-0000-0000-0000-0000000000a1")
	alphaID = uuid.MustParse("00000000-0000-0000-0000-0000000000a2")
	maryID  = uuid.MustParse("00000000-0000-0000-0000-0000000000b1")
	payID   = uuid.MustParse("00000000-0000-0000-0000-0000000000c1")
)

type fakeData struct{}

func (fakeData) Map(context.Context, uuid.UUID) ([]router.MapSite, error) {
	return []router.MapSite{{Name: "Ruiru", Routers: []router.MapRouter{
		{ID: ruiruID, Name: "Ruiru Mast", Status: "offline", Neighbors: []router.MapNeighbor{}},
		{ID: alphaID, Name: "Tower Alpha", Status: "degraded", Neighbors: []router.MapNeighbor{}},
	}}}, nil
}

func (fakeData) Metrics(_ context.Context, _, _ uuid.UUID, rng string) (router.Series, error) {
	pts := []router.Point{}
	for i := 0; i < 200; i++ { // 88 of 288 five-minute samples missing
		pts = append(pts, router.Point{CPULoad: 40, PPPoEUsers: 30, HotspotUsers: 5, RxBps: 12_000_000})
	}
	return router.Series{Range: rng, StepSec: 300, Points: pts}, nil
}

func (fakeData) Audit(context.Context, uuid.UUID, uuid.UUID, int32) ([]store.ConfigAudit, error) {
	return []store.ConfigAudit{{Action: "PUSH_CONFIG", Status: "SUCCESS", InitiatedBy: "system", CreatedAt: time.Now()}}, nil
}

func (fakeData) ListSubscribers(_ context.Context, _ uuid.UUID, f customers.ListFilter) ([]store.ListSubscribersRow, map[string]int32, error) {
	price := int32(150000)
	plan := "Bronze 5 Mbps"
	rows := []store.ListSubscribersRow{{ID: maryID, FullName: "Mary Wanjiku", PhoneNumber: "254712345678", PppoeUsername: "JZM1042", Status: "active", PlanName: &plan, PlanPriceCents: &price}}
	if f.Query != "" && !strings.Contains("JZM1042 Mary Wanjiku", f.Query) {
		rows = nil
	}
	return rows, map[string]int32{"active": 1}, nil
}

func (fakeData) ListPlans(context.Context, uuid.UUID, string) ([]store.Plan, error) {
	return []store.Plan{{Name: "Bronze 5 Mbps", AccessType: "pppoe", PriceCents: 150000, BandwidthDownKbps: 5000, BandwidthUpKbps: 2000, IsActive: true}}, nil
}

func (fakeData) Payments(_ context.Context, _ uuid.UUID, status *string, _ int32) ([]billing.PaymentView, error) {
	return []billing.PaymentView{{ID: payID, Kind: "unmatched", Status: "unmatched", AmountKES: 1500, Phone: "254712345678", Reference: "JOHN"}}, nil
}

func (fakeData) Overview(context.Context, uuid.UUID) (dashboard.Overview, error) {
	return dashboard.Overview{MpesaToday: 18420}, nil
}

// ── fake Claude API ──────────────────────────────────────────

func ev(v map[string]any) string {
	b, _ := json.Marshal(v)
	return fmt.Sprintf("event: %s\ndata: %s\n\n", v["type"], b)
}

func start(in int) string {
	return ev(map[string]any{"type": "message_start", "message": map[string]any{
		"id": "msg_1", "type": "message", "role": "assistant", "model": "claude-opus-5-5", "content": []any{},
		"stop_reason": nil, "stop_sequence": nil, "usage": map[string]any{"input_tokens": in, "output_tokens": 1},
	}})
}

func text(i int, chunks ...string) string {
	out := ev(map[string]any{"type": "content_block_start", "index": i, "content_block": map[string]any{"type": "text", "text": ""}})
	for _, c := range chunks {
		out += ev(map[string]any{"type": "content_block_delta", "index": i, "delta": map[string]any{"type": "text_delta", "text": c}})
	}
	return out + ev(map[string]any{"type": "content_block_stop", "index": i})
}

func toolUse(i int, id, name, input string) string {
	out := ev(map[string]any{"type": "content_block_start", "index": i, "content_block": map[string]any{"type": "tool_use", "id": id, "name": name, "input": map[string]any{}}})
	// Eager input streaming: the JSON arrives in pieces.
	for len(input) > 0 {
		n := min(7, len(input))
		out += ev(map[string]any{"type": "content_block_delta", "index": i, "delta": map[string]any{"type": "input_json_delta", "partial_json": input[:n]}})
		input = input[n:]
	}
	return out + ev(map[string]any{"type": "content_block_stop", "index": i})
}

func end(reason string, out int) string {
	return ev(map[string]any{"type": "message_delta", "delta": map[string]any{"stop_reason": reason, "stop_sequence": nil}, "usage": map[string]any{"output_tokens": out}}) +
		ev(map[string]any{"type": "message_stop"})
}

type fakeClaude struct {
	mu       sync.Mutex
	replies  []string // one SSE body per request
	requests []map[string]any
	headers  []http.Header
	status   int // non-zero: fail every request with this status
}

func (f *fakeClaude) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	f.mu.Lock()
	defer f.mu.Unlock()
	body, _ := io.ReadAll(r.Body)
	var req map[string]any
	_ = json.Unmarshal(body, &req)
	f.requests = append(f.requests, req)
	f.headers = append(f.headers, r.Header.Clone())
	if f.status != 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(f.status)
		_, _ = w.Write([]byte(`{"type":"error","error":{"type":"rate_limit_error","message":"slow down"}}`))
		return
	}
	if len(f.replies) == 0 {
		http.Error(w, "no scripted reply", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	_, _ = w.Write([]byte(f.replies[0]))
	f.replies = f.replies[1:]
}

func setup(t *testing.T, fc *fakeClaude, limit int) (*assistant.Service, uuid.UUID) {
	d := testutil.DB(t)
	tn := fixtures.Tenant(t, d, testutil.Sealer(t), "Assist WiFi")
	srv := httptest.NewServer(fc)
	t.Cleanup(srv.Close)
	fd := fakeData{}
	s := &assistant.Service{
		DB: d, Client: assistant.NewClient("test-key", option.WithBaseURL(srv.URL), option.WithMaxRetries(0)),
		Model: "claude-opus-5-5", DailyLimit: limit,
		Network: fd, Customers: fd, Payments: fd, Overview: fd,
		TenantInfo: func(context.Context, uuid.UUID) (string, string, error) { return "Assist WiFi", "Africa/Nairobi", nil },
	}
	return s, tn.ID
}

func collect(t *testing.T, s *assistant.Service, tenant uuid.UUID, q string) ([]assistant.Event, error) {
	t.Helper()
	var evs []assistant.Event
	err := s.Ask(context.Background(), tenant, []assistant.Message{{Role: "user", Text: q}}, func(e assistant.Event) { evs = append(evs, e) })
	return evs, err
}

func joined(evs []assistant.Event, typ string) string {
	var b strings.Builder
	for _, e := range evs {
		if e.Type == typ {
			b.WriteString(e.Text + "|")
		}
	}
	return b.String()
}

// ── tests ────────────────────────────────────────────────────

func TestAskRunsToolsAndStreamsAnswer(t *testing.T) {
	fc := &fakeClaude{replies: []string{
		start(1200) + toolUse(0, "toolu_1", "network_overview", `{}`) + toolUse(1, "toolu_2", "router_details", `{"router":"ruiru mast"}`) + end("tool_use", 40),
		start(1500) + text(0, "Let me prepare a fix.") + toolUse(1, "toolu_3", "propose_router_sync", fmt.Sprintf(`{"router_id":"%s","reason":"Re-push settings"}`, alphaID)) + end("tool_use", 30),
		start(1800) + text(0, "Ruiru Mast is ", "offline.") + end("end_turn", 25),
	}}
	s, tenant := setup(t, fc, 5)
	evs, err := collect(t, s, tenant, "Why is Ruiru Mast down?")
	if err != nil {
		t.Fatal(err)
	}
	if got := joined(evs, "status"); got != "Checking routers|Reading router history|Preparing a fix|" {
		t.Fatalf("status events = %q", got)
	}
	if got := joined(evs, "text"); got != "Let me prepare a fix.|Ruiru Mast is |offline.|" {
		t.Fatalf("text events = %q", got)
	}
	var props []*assistant.Proposal
	for _, e := range evs {
		if e.Type == "proposal" {
			props = append(props, e.Proposal)
		}
	}
	if len(props) != 1 || props[0].Kind != "router_sync" || props[0].Title != "Sync Tower Alpha" || props[0].Target["router_id"] != alphaID {
		t.Fatalf("proposals = %+v", props)
	}
	if evs[len(evs)-1].Type != "done" {
		t.Fatalf("last event = %+v", evs[len(evs)-1])
	}

	// Request shape: model, effort, fallbacks, strict tools, cached system prefix.
	req := fc.requests[0]
	if req["model"] != "claude-opus-5-5" || req["fallbacks"] != "default" {
		t.Fatalf("model/fallbacks = %v / %v", req["model"], req["fallbacks"])
	}
	if oc, _ := req["output_config"].(map[string]any); oc["effort"] != "medium" {
		t.Fatalf("output_config = %v", req["output_config"])
	}
	if !strings.Contains(fc.headers[0].Get("anthropic-beta"), "server-side-fallback-2026-07-01") {
		t.Fatalf("beta header = %q", fc.headers[0].Get("anthropic-beta"))
	}
	tools := req["tools"].([]any)
	first := tools[0].(map[string]any)
	if first["strict"] != true || first["eager_input_streaming"] != true || first["input_schema"].(map[string]any)["additionalProperties"] != false {
		t.Fatalf("tool def = %v", first)
	}
	sys := req["system"].([]any)
	if sys[0].(map[string]any)["cache_control"] == nil || !strings.Contains(sys[1].(map[string]any)["text"].(string), "Assist WiFi") {
		t.Fatalf("system = %v", sys)
	}

	// Second request carries both tool results in one user turn, append-only.
	msgs := fc.requests[1]["messages"].([]any)
	if len(msgs) != 3 {
		t.Fatalf("round 2 messages = %d", len(msgs))
	}
	results := msgs[2].(map[string]any)["content"].([]any)
	if len(results) != 2 {
		t.Fatalf("tool results = %v", results)
	}
	detail := results[1].(map[string]any)
	body := fmt.Sprint(detail["content"])
	if detail["is_error"] == true || !strings.Contains(body, `"approx_unreachable_minutes":440`) || !strings.Contains(body, "PUSH_CONFIG") {
		t.Fatalf("router_details result = %v", detail)
	}
	if strings.Contains(fmt.Sprint(fc.requests), "254712345678") {
		t.Fatal("a full phone number was sent to the model")
	}

	// Tokens were counted.
	var usage store.AssistantUsage
	_ = s.DB.WithTenant(context.Background(), tenant, func(q *store.Queries) error {
		var err error
		usage, err = q.GetAssistantUsage(context.Background(), dayNow())
		return err
	})
	if usage.Questions != 1 || usage.InputTokens != 4500 || usage.OutputTokens != 95 {
		t.Fatalf("usage = %+v", usage)
	}
}

func TestProposalsValidateTargets(t *testing.T) {
	fc := &fakeClaude{replies: []string{
		start(10) +
			toolUse(0, "t1", "propose_router_sync", fmt.Sprintf(`{"router_id":"%s","reason":"x"}`, ruiruID)) +
			toolUse(1, "t2", "propose_customer_status", `{"account_id":"jzm1042","action":"suspend","reason":"Unpaid"}`) +
			toolUse(2, "t3", "propose_payment_match", fmt.Sprintf(`{"payment_id":"%s","account_id":"JZM1042","reason":"Typed JOHN"}`, payID)) +
			toolUse(3, "t4", "propose_package", `{"name":"2 hrs","access_type":"hotspot","price_kes":25,"down_mbps":5,"up_mbps":2,"duration_minutes":0,"reason":"x"}`) +
			toolUse(4, "t5", "find_customers", `{"query":"JZM1042","status":"all","extra":1}`) +
			end("tool_use", 5),
		start(10) + text(0, "Done looking.") + end("end_turn", 5),
	}}
	s, tenant := setup(t, fc, 5)
	evs, err := collect(t, s, tenant, "Tidy up")
	if err != nil {
		t.Fatal(err)
	}
	kinds := []string{}
	for _, e := range evs {
		if e.Type == "proposal" {
			kinds = append(kinds, e.Proposal.Kind+":"+e.Proposal.Title)
		}
	}
	want := []string{"suspend:Suspend Mary Wanjiku · JZM1042", "payment_match:Credit KSh 1500 (“JOHN”) to Mary Wanjiku · JZM1042"}
	if strings.Join(kinds, ",") != strings.Join(want, ",") {
		t.Fatalf("proposals = %v", kinds)
	}
	results := fc.requests[1]["messages"].([]any)[2].(map[string]any)["content"].([]any)
	errs := 0
	for _, r := range results {
		if r.(map[string]any)["is_error"] == true {
			errs++
		}
	}
	// offline router, hotspot without minutes, unknown field
	if errs != 3 {
		t.Fatalf("want 3 rejected calls, got %d: %v", errs, results)
	}
}

func TestRefusalLimitAndAPIErrors(t *testing.T) {
	fc := &fakeClaude{replies: []string{start(10) + end("refusal", 1)}}
	s, tenant := setup(t, fc, 1)
	evs, err := collect(t, s, tenant, "something odd")
	if err != nil || !strings.Contains(joined(evs, "text"), "I can't help with that one") {
		t.Fatalf("refusal: %v %v", evs, err)
	}

	// Daily limit of 1 is used up.
	_, err = collect(t, s, tenant, "again")
	var he *httpx.Error
	if !errors.As(err, &he) || he.Code != "ASSISTANT_DAILY_LIMIT" {
		t.Fatalf("limit: %v", err)
	}

	// Rate limited by the API: an actionable error event, not a crash.
	fc2 := &fakeClaude{status: http.StatusTooManyRequests}
	s2, tenant2 := setup(t, fc2, 5)
	evs, err = collect(t, s2, tenant2, "hello")
	if err != nil || len(evs) != 1 || evs[0].Type != "error" || evs[0].Error.Code != "ASSISTANT_BUSY" {
		t.Fatalf("429: %+v %v", evs, err)
	}

	// No key: switched off with a clear hint.
	s2.Client = nil
	if _, err := collect(t, s2, tenant2, "hello"); !errors.As(err, &he) || he.Code != "ASSISTANT_NOT_CONFIGURED" {
		t.Fatalf("no key: %v", err)
	}
}

func TestValidate(t *testing.T) {
	ok := []assistant.Message{{Role: "user", Text: "a"}, {Role: "assistant", Text: "b"}, {Role: "user", Text: "c"}}
	if err := assistant.Validate(ok); err != nil {
		t.Fatal(err)
	}
	bad := [][]assistant.Message{
		nil,
		{{Role: "assistant", Text: "a"}},
		{{Role: "user", Text: "a"}, {Role: "assistant", Text: "b"}},
		{{Role: "user", Text: "  "}},
		{{Role: "user", Text: strings.Repeat("x", 4001)}},
		{{Role: "user", Text: "a"}, {Role: "user", Text: "b"}},
	}
	for i, m := range bad {
		if assistant.Validate(m) == nil {
			t.Errorf("case %d accepted", i)
		}
	}
}

func dayNow() pgtype.Date {
	n := time.Now().In(time.FixedZone("EAT", 3*3600))
	return pgtype.Date{Time: time.Date(n.Year(), n.Month(), n.Day(), 0, 0, 0, 0, time.UTC), Valid: true}
}

func TestChatEndpointStreamsSSE(t *testing.T) {
	fc := &fakeClaude{replies: []string{start(10) + text(0, "Hi") + end("end_turn", 2)}}
	s, tenant := setup(t, fc, 5)
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			next.ServeHTTP(w, req.WithContext(auth.WithTenant(req.Context(), tenant)))
		})
	})
	s.Routes(r)
	srv := httptest.NewServer(r)
	defer srv.Close()

	res, err := http.Post(srv.URL+"/v1/assistant/chat", "application/json", strings.NewReader(`{"messages":[{"role":"assistant","text":"x"}]}`))
	if err != nil {
		t.Fatal(err)
	}
	b, _ := io.ReadAll(res.Body)
	if res.StatusCode != http.StatusBadRequest || !strings.Contains(string(b), "INVALID_CONVERSATION") {
		t.Fatalf("bad conversation: %d %s", res.StatusCode, b)
	}

	res, err = http.Post(srv.URL+"/v1/assistant/chat", "application/json", strings.NewReader(`{"messages":[{"role":"user","text":"hello"}]}`))
	if err != nil {
		t.Fatal(err)
	}
	b, _ = io.ReadAll(res.Body)
	if res.Header.Get("Content-Type") != "text/event-stream" || string(b) != "data: {\"type\":\"text\",\"text\":\"Hi\"}\n\ndata: {\"type\":\"done\"}\n\n" {
		t.Fatalf("stream: %s %q", res.Header.Get("Content-Type"), b)
	}

	res, err = http.Get(srv.URL + "/v1/assistant")
	if err != nil {
		t.Fatal(err)
	}
	b, _ = io.ReadAll(res.Body)
	if !strings.Contains(string(b), `"enabled":true`) || !strings.Contains(string(b), `"remaining_today":4`) {
		t.Fatalf("status: %s", b)
	}
}
