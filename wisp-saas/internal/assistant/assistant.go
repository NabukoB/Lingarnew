// Package assistant answers a WISP's questions about their own network,
// customers and money with Claude. Claude only gets read tools scoped to the
// signed-in tenant (row-level security still applies underneath) and
// "propose" tools that put a confirm card on screen; nothing changes until
// the owner taps Confirm, which calls the normal API endpoint.
//
// PPPoE passwords, M-Pesa secrets and full phone numbers never reach the model.
package assistant

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/nabukob/lingarnew/wisp-saas/internal/billing"
	"github.com/nabukob/lingarnew/wisp-saas/internal/customers"
	"github.com/nabukob/lingarnew/wisp-saas/internal/dashboard"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/db"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/router"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
)

// What the assistant may read, provided by the other packages' services.
type (
	Network interface {
		Map(ctx context.Context, tenantID uuid.UUID) ([]router.MapSite, error)
		Metrics(ctx context.Context, tenantID, routerID uuid.UUID, rng string) (router.Series, error)
		Audit(ctx context.Context, tenantID, routerID uuid.UUID, limit int32) ([]store.ConfigAudit, error)
	}
	Customers interface {
		ListSubscribers(ctx context.Context, tenantID uuid.UUID, f customers.ListFilter) ([]store.ListSubscribersRow, map[string]int32, error)
		ListPlans(ctx context.Context, tenantID uuid.UUID, accessType string) ([]store.Plan, error)
	}
	Payments interface {
		Payments(ctx context.Context, tenantID uuid.UUID, status *string, limit int32) ([]billing.PaymentView, error)
	}
	Overview interface {
		Overview(ctx context.Context, tenantID uuid.UUID) (dashboard.Overview, error)
	}
)

func customersFilter(status, query string) customers.ListFilter {
	return customers.ListFilter{Status: status, Query: query, Limit: 20}
}

const (
	maxTurns       = 20   // messages the client may send back
	maxMessageLen  = 4000 // characters per message
	maxToolRounds  = 6    // tool round-trips per question
	defaultMaxTok  = 16000
	refusalMessage = "I can't help with that one. Ask me about your routers, customers, payments or packages."
)

type Service struct {
	DB         *db.DB
	Client     *anthropic.Client // nil = not configured
	Model      string
	DailyLimit int
	Network    Network
	Customers  Customers
	Payments   Payments
	Overview   Overview
	TenantInfo func(ctx context.Context, tenantID uuid.UUID) (name, timezone string, err error)
	Now        func() time.Time
}

// NewClient builds the Claude client, or returns nil when apiKey is empty.
func NewClient(apiKey string, opts ...option.RequestOption) *anthropic.Client {
	if apiKey == "" {
		return nil
	}
	c := anthropic.NewClient(append([]option.RequestOption{option.WithAPIKey(apiKey), option.WithRequestTimeout(2 * time.Minute)}, opts...)...)
	return &c
}

func (s *Service) now() time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

// Message is one prior turn as the dashboard keeps it (text only).
type Message struct {
	Role string `json:"role"` // user | assistant
	Text string `json:"text"`
}

// Event is one server-sent event to the dashboard.
type Event struct {
	Type     string    `json:"type"` // text | status | proposal | done | error
	Text     string    `json:"text,omitempty"`
	Proposal *Proposal `json:"proposal,omitempty"`
	Error    *apiError `json:"error,omitempty"`
}

type apiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Hint    string `json:"hint,omitempty"`
}

// turn carries one question's tenant and event sink into the tools.
type turn struct {
	tenantID uuid.UUID
	emit     func(Event)
}

var (
	ErrNotConfigured = httpx.NewError(http.StatusServiceUnavailable, "ASSISTANT_NOT_CONFIGURED",
		"The assistant isn't switched on for this server.", "Ask support to switch it on (it needs ANTHROPIC_API_KEY).")
	ErrDailyLimit = httpx.NewError(http.StatusTooManyRequests, "ASSISTANT_DAILY_LIMIT",
		"You've used today's assistant questions.", "The limit resets at midnight. Everything else in the dashboard still works.")
)

// Validate checks the conversation the dashboard sent.
func Validate(msgs []Message) error {
	bad := func(m string) error {
		return httpx.BadRequest("INVALID_CONVERSATION", m, "Start a new chat and ask again.")
	}
	if len(msgs) == 0 || len(msgs) > maxTurns {
		return bad(fmt.Sprintf("Send between 1 and %d messages.", maxTurns))
	}
	for i, m := range msgs {
		want := "user"
		if i%2 == 1 {
			want = "assistant"
		}
		if m.Role != want {
			return bad("Messages must alternate, starting and ending with your question.")
		}
		if strings.TrimSpace(m.Text) == "" || len([]rune(m.Text)) > maxMessageLen {
			return bad(fmt.Sprintf("Each message must be 1-%d characters.", maxMessageLen))
		}
	}
	if msgs[len(msgs)-1].Role != "user" {
		return bad("The last message must be your question.")
	}
	return nil
}

const systemPrompt = `You are the assistant inside Mtandao, the dashboard a small Kenyan wireless ISP (a WISP) uses to run MikroTik routers, PPPoE home customers, a Hotspot captive portal and M-Pesa billing. The person asking owns or runs the ISP; they are not a network engineer.

How to work:
- Look things up with the tools before answering; never guess numbers, names or statuses. Tools only see this ISP's data.
- Answer in plain, short sentences. Lead with the answer, then at most a few bullet points. Money is KSh with thousands separators. Times are East Africa Time. Say "router", "customer", "package", "payment" — avoid jargon like RADIUS or CoA unless they ask.
- When something is wrong, say the most likely cause and the one thing to do next. Common fixes: an offline router usually lost power or internet (check the uplink cable and the ISP's fibre box); "pending" means the setup command has not finished on the router; a customer who paid but is offline can be checked under Customers; an unmatched payment usually means the customer typed the wrong account number.
- To change anything, use a propose_ tool. It only shows the owner a confirm card; never claim a change happened. Propose at most one change per answer unless asked for more.
- Never reveal or ask for passwords, M-Pesa keys or full phone numbers. If asked for something outside running this ISP, say briefly that you can only help with the dashboard.`

func (s *Service) systemBlocks(ctx context.Context, tenantID uuid.UUID) []anthropic.BetaTextBlockParam {
	name, tz := "", "Africa/Nairobi"
	if s.TenantInfo != nil {
		if n, z, err := s.TenantInfo(ctx, tenantID); err == nil {
			name, tz = n, z
		}
	}
	loc, err := time.LoadLocation(tz)
	if err != nil {
		loc = time.FixedZone("EAT", 3*3600)
	}
	ctxLine := fmt.Sprintf("Business: %s. Now: %s.", name, s.now().In(loc).Format("Monday 2 January 2006, 15:04"))
	return []anthropic.BetaTextBlockParam{
		// Stable prefix (tools + this block) is cached; the per-request line follows the breakpoint.
		{Text: systemPrompt, CacheControl: anthropic.NewBetaCacheControlEphemeralParam()},
		{Text: ctxLine},
	}
}

// day is the usage-counter date in East Africa Time.
func (s *Service) day() pgtype.Date {
	t := s.now().In(time.FixedZone("EAT", 3*3600))
	return pgtype.Date{Time: time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC), Valid: true}
}

// Ask answers the last question in msgs, streaming events to emit. Errors
// returned before the first event can be sent as normal HTTP errors.
func (s *Service) Ask(ctx context.Context, tenantID uuid.UUID, msgs []Message, emit func(Event)) error {
	if s.Client == nil {
		return ErrNotConfigured
	}
	if err := Validate(msgs); err != nil {
		return err
	}
	if err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		_, err := q.TakeAssistantQuestion(ctx, store.TakeAssistantQuestionParams{Day: s.day(), DailyLimit: int32(s.DailyLimit)})
		if db.IsNotFound(err) {
			return ErrDailyLimit
		}
		return err
	}); err != nil {
		return err
	}

	history := make([]anthropic.BetaMessageParam, 0, len(msgs))
	for _, m := range msgs {
		block := anthropic.NewBetaTextBlock(m.Text)
		if m.Role == "user" {
			history = append(history, anthropic.NewBetaUserMessage(block))
		} else {
			history = append(history, anthropic.BetaMessageParam{Role: anthropic.BetaMessageParamRoleAssistant, Content: []anthropic.BetaContentBlockParamUnion{block}})
		}
	}
	params := anthropic.BetaMessageNewParams{
		Model:        anthropic.Model(s.Model),
		MaxTokens:    defaultMaxTok,
		System:       s.systemBlocks(ctx, tenantID),
		Tools:        toolParams(),
		Messages:     history,
		OutputConfig: anthropic.BetaOutputConfigParam{Effort: anthropic.BetaOutputConfigEffortMedium},
		// On a safety decline the API re-runs the turn on a fallback model it picks.
		Fallbacks: anthropic.BetaFallbacksParamUnion{OfDefault: "default"},
		Betas:     []anthropic.AnthropicBeta{anthropic.AnthropicBetaServerSideFallback2026_07_01},
	}

	t := turn{tenantID: tenantID, emit: emit}
	var inTok, outTok int64
	defer func() {
		// Count tokens even when the question fails half-way.
		_ = s.DB.WithTenant(context.WithoutCancel(ctx), tenantID, func(q *store.Queries) error {
			return q.AddAssistantTokens(context.WithoutCancel(ctx), store.AddAssistantTokensParams{InputTokens: inTok, OutputTokens: outTok, Day: s.day()})
		})
	}()

	for round := 0; ; round++ {
		msg, err := s.stream(ctx, params, emit)
		inTok += msg.Usage.InputTokens + msg.Usage.CacheReadInputTokens + msg.Usage.CacheCreationInputTokens
		outTok += msg.Usage.OutputTokens
		if err != nil {
			emit(Event{Type: "error", Error: friendly(err)})
			return nil
		}
		switch msg.StopReason {
		case anthropic.BetaStopReasonRefusal:
			emit(Event{Type: "text", Text: refusalMessage})
			emit(Event{Type: "done"})
			return nil
		case anthropic.BetaStopReasonToolUse:
		default: // end_turn, max_tokens, pause_turn, ...
			emit(Event{Type: "done"})
			return nil
		}
		if round >= maxToolRounds {
			emit(Event{Type: "text", Text: "\n\nThat needed more lookups than I'm allowed for one question. Try asking about one router or customer at a time."})
			emit(Event{Type: "done"})
			return nil
		}
		params.Messages = append(params.Messages, msg.ToParam())
		results := []anthropic.BetaContentBlockParamUnion{}
		for _, block := range msg.Content {
			if block.Type == "tool_use" {
				results = append(results, s.runTool(ctx, t, block.ID, block.Name, json.RawMessage(block.Input)))
			}
		}
		params.Messages = append(params.Messages, anthropic.NewBetaUserMessage(results...))
	}
}

// stream runs one request, forwarding text as it arrives, and returns the
// complete message.
func (s *Service) stream(ctx context.Context, params anthropic.BetaMessageNewParams, emit func(Event)) (anthropic.BetaMessage, error) {
	st := s.Client.Beta.Messages.NewStreaming(ctx, params)
	defer st.Close()
	msg := anthropic.BetaMessage{}
	for st.Next() {
		ev := st.Current()
		if err := msg.Accumulate(ev); err != nil {
			return msg, err
		}
		if d, ok := ev.AsAny().(anthropic.BetaRawContentBlockDeltaEvent); ok {
			if td, ok := d.Delta.AsAny().(anthropic.BetaTextDelta); ok && td.Text != "" {
				emit(Event{Type: "text", Text: td.Text})
			}
		}
	}
	return msg, st.Err()
}

// runTool executes one tool call and returns its tool_result block.
// raw is the accumulated (eagerly streamed) input, so it is validated here
// before anything runs.
func (s *Service) runTool(ctx context.Context, t turn, id, name string, raw json.RawMessage) anthropic.BetaContentBlockParamUnion {
	use := struct{ ID, Name string }{id, name}
	tl := toolByName(use.Name)
	if tl == nil {
		return anthropic.NewBetaToolResultBlock(use.ID, "Unknown tool "+use.Name, true)
	}
	if tl.status != "" {
		t.emit(Event{Type: "status", Text: tl.status})
	}
	if len(raw) == 0 || !json.Valid(raw) {
		return anthropic.NewBetaToolResultBlock(use.ID, "INVALID_JSON: the tool input was not valid JSON; call the tool again.", true)
	}
	tctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	out, err := tl.run(tctx, s, t, raw)
	if err != nil {
		var te toolError
		if errors.As(err, &te) {
			return anthropic.NewBetaToolResultBlock(use.ID, te.msg, true)
		}
		var he *httpx.Error
		if errors.As(err, &he) {
			return anthropic.NewBetaToolResultBlock(use.ID, he.Message+" "+he.Hint, true)
		}
		slog.ErrorContext(ctx, "assistant tool failed", "tool", use.Name, "tenant_id", t.tenantID, "err", err)
		return anthropic.NewBetaToolResultBlock(use.ID, "The lookup failed on our side. Tell the owner to try again shortly.", true)
	}
	b, err := json.Marshal(out)
	if err != nil {
		return anthropic.NewBetaToolResultBlock(use.ID, "Could not encode the result.", true)
	}
	return anthropic.NewBetaToolResultBlock(use.ID, string(b), false)
}

// friendly turns a Claude API failure into a message the owner can act on.
func friendly(err error) *apiError {
	var ae *anthropic.Error
	if errors.As(err, &ae) {
		switch ae.StatusCode {
		case http.StatusUnauthorized, http.StatusForbidden:
			return &apiError{"ASSISTANT_NOT_CONFIGURED", "The assistant's API key was rejected.", "Ask support to check ANTHROPIC_API_KEY."}
		case http.StatusTooManyRequests, 529:
			return &apiError{"ASSISTANT_BUSY", "The assistant is busy right now.", "Try again in a minute."}
		case http.StatusBadRequest:
			slog.Error("assistant request rejected", "err", err)
			return &apiError{"ASSISTANT_FAILED", "The assistant couldn't read that conversation.", "Start a new chat and ask again."}
		}
	}
	if errors.Is(err, context.Canceled) {
		return &apiError{"ASSISTANT_STOPPED", "Stopped.", ""}
	}
	slog.Error("assistant stream failed", "err", err)
	return &apiError{"ASSISTANT_UNAVAILABLE", "The assistant didn't answer.", "Check your connection and try again."}
}
