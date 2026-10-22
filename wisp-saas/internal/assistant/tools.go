package assistant

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/google/uuid"

	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/phone"
	"github.com/nabukob/lingarnew/wisp-saas/internal/router"
)

// tool is one function Claude may call. Read tools run immediately against the
// signed-in WISP's data; propose tools never change anything — they validate
// the target and hand a confirm card to the dashboard.
type tool struct {
	name        string
	description string
	props       map[string]any
	required    []string
	status      string // shown while it runs, e.g. "Checking routers"
	run         func(ctx context.Context, s *Service, t turn, input json.RawMessage) (any, error)
}

// toolError is returned to Claude as an is_error tool_result.
type toolError struct{ msg string }

func (e toolError) Error() string { return e.msg }

func str(desc string) map[string]any { return map[string]any{"type": "string", "description": desc} }
func enum(desc string, vals ...string) map[string]any {
	return map[string]any{"type": "string", "description": desc, "enum": vals}
}
func integer(desc string) map[string]any {
	return map[string]any{"type": "integer", "description": desc}
}

func decode[T any](raw json.RawMessage) (T, error) {
	var v T
	dec := json.NewDecoder(strings.NewReader(string(raw)))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&v); err != nil {
		return v, toolError{"INVALID_JSON: " + err.Error()}
	}
	return v, nil
}

var tools = []tool{
	{
		name:        "network_overview",
		description: "Every site and router with status (online/degraded/offline/pending), users online, CPU, and what each router sees next to it. Start here for any network question.",
		props:       map[string]any{},
		status:      "Checking routers",
		run: func(ctx context.Context, s *Service, t turn, _ json.RawMessage) (any, error) {
			return s.Network.Map(ctx, t.tenantID)
		},
	},
	{
		name:        "router_details",
		description: "One router's facts, last-24h health summary (CPU, users, uplink, missing samples = time unreachable) and its recent config changes. Accepts the router's name or id.",
		props:       map[string]any{"router": str("Router name (case-insensitive) or id.")},
		required:    []string{"router"},
		status:      "Reading router history",
		run:         routerDetails,
	},
	{
		name:        "find_customers",
		description: "Search PPPoE customers by name, account ID (e.g. JZM1042) or phone. Phone numbers come back masked. Returns at most 20.",
		props: map[string]any{
			"query":  str("Name, account ID or phone; empty string lists the newest."),
			"status": enum("Filter by status.", "all", "active", "expired", "suspended", "cancelled"),
		},
		required: []string{"query", "status"},
		status:   "Looking up customers",
		run:      findCustomers,
	},
	{
		name:        "recent_payments",
		description: "Newest M-Pesa payments (up to 30). 'unmatched' lists Paybill payments whose account number matched nobody.",
		props:       map[string]any{"status": enum("Filter by status.", "all", "success", "failed", "pending", "unmatched")},
		required:    []string{"status"},
		status:      "Reading payments",
		run:         recentPayments,
	},
	{
		name:        "business_summary",
		description: "Today's M-Pesa total vs yesterday, users online, PPPoE count, hotspot sales, on-time payment rate, renewals due, SMS credits, router counts.",
		props:       map[string]any{},
		status:      "Adding up today",
		run: func(ctx context.Context, s *Service, t turn, _ json.RawMessage) (any, error) {
			return s.Overview.Overview(ctx, t.tenantID)
		},
	},
	{
		name:        "list_packages",
		description: "All packages (PPPoE monthly plans and Hotspot time packages) with price and speed.",
		props:       map[string]any{},
		status:      "Reading packages",
		run:         listPackages,
	},
	{
		name:        "propose_router_sync",
		description: "Suggest re-pushing our RADIUS, hotspot and firewall settings to a router (fixes 'misconfigured' and failed checklist items). Shows a confirm card; does nothing until the owner confirms.",
		props:       map[string]any{"router_id": str("Router id from network_overview."), "reason": str("One short sentence the owner will see.")},
		required:    []string{"router_id", "reason"},
		status:      "Preparing a fix",
		run:         proposeRouterSync,
	},
	{
		name:        "propose_customer_status",
		description: "Suggest suspending or reactivating a PPPoE customer. Shows a confirm card; does nothing until the owner confirms.",
		props: map[string]any{
			"account_id": str("Account ID, e.g. JZM1042."),
			"action":     enum("What to do.", "suspend", "reactivate"),
			"reason":     str("One short sentence the owner will see."),
		},
		required: []string{"account_id", "action", "reason"},
		status:   "Preparing a change",
		run:      proposeCustomerStatus,
	},
	{
		name:        "propose_payment_match",
		description: "Suggest crediting an unmatched Paybill payment to a customer. Shows a confirm card; does nothing until the owner confirms.",
		props: map[string]any{
			"payment_id": str("Payment id from recent_payments (status unmatched)."),
			"account_id": str("Customer account ID to credit."),
			"reason":     str("One short sentence the owner will see."),
		},
		required: []string{"payment_id", "account_id", "reason"},
		status:   "Preparing a match",
		run:      proposePaymentMatch,
	},
	{
		name:        "propose_send_stk",
		description: "Suggest sending an M-Pesa payment prompt (STK push) for a customer's plan price to their phone. Shows a confirm card; does nothing until the owner confirms.",
		props:       map[string]any{"account_id": str("Account ID, e.g. JZM1042."), "reason": str("One short sentence the owner will see.")},
		required:    []string{"account_id", "reason"},
		status:      "Preparing a prompt",
		run:         proposeSendSTK,
	},
	{
		name:        "propose_package",
		description: "Suggest a new package. PPPoE plans are monthly (duration_minutes 0); Hotspot packages need duration_minutes > 0. Shows a confirm card; does nothing until the owner confirms.",
		props: map[string]any{
			"name":             str("Short name, e.g. 'Gold 20 Mbps' or '2 hrs'."),
			"access_type":      enum("Kind of package.", "pppoe", "hotspot"),
			"price_kes":        integer("Price in whole KSh."),
			"down_mbps":        integer("Download speed in Mbps."),
			"up_mbps":          integer("Upload speed in Mbps."),
			"duration_minutes": integer("Hotspot time in minutes; 0 for PPPoE monthly."),
			"reason":           str("One short sentence the owner will see."),
		},
		required: []string{"name", "access_type", "price_kes", "down_mbps", "up_mbps", "duration_minutes", "reason"},
		status:   "Drafting a package",
		run:      proposePackage,
	},
}

func toolByName(name string) *tool {
	for i := range tools {
		if tools[i].name == name {
			return &tools[i]
		}
	}
	return nil
}

// toolParams is the tools list sent to Claude (strict schemas, streamed input).
func toolParams() []anthropic.BetaToolUnionParam {
	out := make([]anthropic.BetaToolUnionParam, 0, len(tools))
	for _, t := range tools {
		p := anthropic.BetaToolParam{
			Name:        t.name,
			Description: anthropic.String(t.description),
			InputSchema: anthropic.BetaToolInputSchemaParam{
				Properties:  t.props,
				Required:    t.required,
				ExtraFields: map[string]any{"additionalProperties": false},
			},
			Strict:              anthropic.Bool(true),
			EagerInputStreaming: anthropic.Bool(true),
		}
		out = append(out, anthropic.BetaToolUnionParam{OfTool: &p})
	}
	return out
}

// ── read tools ───────────────────────────────────────────────

func findRouter(ctx context.Context, s *Service, t turn, ref string) (router.MapRouter, string, error) {
	sites, err := s.Network.Map(ctx, t.tenantID)
	if err != nil {
		return router.MapRouter{}, "", err
	}
	ref = strings.TrimSpace(ref)
	for _, site := range sites {
		for _, r := range site.Routers {
			if r.ID.String() == ref || strings.EqualFold(r.Name, ref) {
				return r, site.Name, nil
			}
		}
	}
	return router.MapRouter{}, "", toolError{fmt.Sprintf("No router called %q. Call network_overview for the list.", ref)}
}

type healthSummary struct {
	Samples         int     `json:"samples"`
	MissingSamples  int     `json:"missing_samples"`
	UnreachableMins int     `json:"approx_unreachable_minutes"`
	CPUAvg          float64 `json:"cpu_avg_pct"`
	CPUMax          int32   `json:"cpu_max_pct"`
	UsersPeak       int32   `json:"users_peak"`
	DownPeakMbps    float64 `json:"uplink_down_peak_mbps"`
	DownAvgMbps     float64 `json:"uplink_down_avg_mbps"`
}

func summarize(s router.Series) healthSummary {
	h := healthSummary{Samples: len(s.Points)}
	expected := int((24 * time.Hour) / (time.Duration(s.StepSec) * time.Second))
	if h.Samples < expected {
		h.MissingSamples = expected - h.Samples
		h.UnreachableMins = h.MissingSamples * int(s.StepSec) / 60
	}
	var cpu, down float64
	for _, p := range s.Points {
		cpu += float64(p.CPULoad)
		down += float64(p.RxBps)
		h.CPUMax = max(h.CPUMax, p.CPULoad)
		h.UsersPeak = max(h.UsersPeak, p.PPPoEUsers+p.HotspotUsers)
		h.DownPeakMbps = max(h.DownPeakMbps, round1(float64(p.RxBps)/1e6))
	}
	if h.Samples > 0 {
		h.CPUAvg = round1(cpu / float64(h.Samples))
		h.DownAvgMbps = round1(down / float64(h.Samples) / 1e6)
	}
	return h
}

func round1(f float64) float64 { return float64(int64(f*10+0.5)) / 10 }

func routerDetails(ctx context.Context, s *Service, t turn, raw json.RawMessage) (any, error) {
	in, err := decode[struct {
		Router string `json:"router"`
	}](raw)
	if err != nil {
		return nil, err
	}
	r, site, err := findRouter(ctx, s, t, in.Router)
	if err != nil {
		return nil, err
	}
	series, err := s.Network.Metrics(ctx, t.tenantID, r.ID, "24h")
	if err != nil {
		return nil, err
	}
	audit, err := s.Network.Audit(ctx, t.tenantID, r.ID, 10)
	if err != nil {
		return nil, err
	}
	type change struct {
		At     time.Time `json:"at"`
		Action string    `json:"action"`
		Status string    `json:"status"`
		Error  *string   `json:"error,omitempty"`
		By     string    `json:"by"`
	}
	changes := make([]change, 0, len(audit))
	for _, a := range audit {
		changes = append(changes, change{At: a.CreatedAt, Action: a.Action, Status: a.Status, Error: a.ErrorMessage, By: a.InitiatedBy})
	}
	return map[string]any{
		"router": r, "site": site, "last_24h": summarize(series), "recent_changes": changes,
		"note": "status 'pending' means the setup script has not finished; 'degraded' means 3+ missed polls; 'offline' means 10+.",
	}, nil
}

func findCustomers(ctx context.Context, s *Service, t turn, raw json.RawMessage) (any, error) {
	in, err := decode[struct {
		Query  string `json:"query"`
		Status string `json:"status"`
	}](raw)
	if err != nil {
		return nil, err
	}
	status := in.Status
	if status == "all" {
		status = ""
	}
	rows, counts, err := s.Customers.ListSubscribers(ctx, t.tenantID, customersFilter(status, in.Query))
	if err != nil {
		return nil, err
	}
	type row struct {
		AccountID string     `json:"account_id"`
		Name      string     `json:"name"`
		Phone     string     `json:"phone"`
		Status    string     `json:"status"`
		Plan      *string    `json:"plan"`
		PriceKES  *int32     `json:"price_kes"`
		PaidUntil *time.Time `json:"paid_until"`
		CreditKES int32      `json:"credit_kes"`
		Online    bool       `json:"online"`
	}
	out := make([]row, 0, len(rows))
	for _, r := range rows {
		var price *int32
		if r.PlanPriceCents != nil {
			p := *r.PlanPriceCents / 100
			price = &p
		}
		out = append(out, row{AccountID: r.PppoeUsername, Name: r.FullName, Phone: phone.Masked(r.PhoneNumber), Status: r.Status,
			Plan: r.PlanName, PriceKES: price, PaidUntil: r.NextRenewalAt, CreditKES: r.CreditCents / 100, Online: r.Online})
	}
	return map[string]any{"customers": out, "counts_by_status": counts}, nil
}

func recentPayments(ctx context.Context, s *Service, t turn, raw json.RawMessage) (any, error) {
	in, err := decode[struct {
		Status string `json:"status"`
	}](raw)
	if err != nil {
		return nil, err
	}
	var status *string
	if in.Status != "all" {
		status = &in.Status
	}
	rows, err := s.Payments.Payments(ctx, t.tenantID, status, 30)
	if err != nil {
		return nil, err
	}
	for i := range rows {
		rows[i].Phone = phone.Masked(rows[i].Phone)
	}
	return map[string]any{"payments": rows}, nil
}

func listPackages(ctx context.Context, s *Service, t turn, _ json.RawMessage) (any, error) {
	plans, err := s.Customers.ListPlans(ctx, t.tenantID, "")
	if err != nil {
		return nil, err
	}
	type pkg struct {
		ID              uuid.UUID `json:"id"`
		Name            string    `json:"name"`
		Kind            string    `json:"kind"`
		PriceKES        int32     `json:"price_kes"`
		DownMbps        float64   `json:"down_mbps"`
		UpMbps          float64   `json:"up_mbps"`
		DurationMinutes *int32    `json:"duration_minutes,omitempty"`
		Active          bool      `json:"active"`
		Trial           bool      `json:"trial,omitempty"`
	}
	out := make([]pkg, 0, len(plans))
	for _, p := range plans {
		out = append(out, pkg{ID: p.ID, Name: p.Name, Kind: p.AccessType, PriceKES: p.PriceCents / 100,
			DownMbps: round1(float64(p.BandwidthDownKbps) / 1000), UpMbps: round1(float64(p.BandwidthUpKbps) / 1000),
			DurationMinutes: p.DurationMinutes, Active: p.IsActive, Trial: p.IsTrial})
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Kind < out[j].Kind })
	return map[string]any{"packages": out}, nil
}

// ── proposals ────────────────────────────────────────────────

// Proposal is a change Claude suggests. The dashboard shows it as a card and,
// on Confirm, calls the normal API endpoint for it.
type Proposal struct {
	ID     uuid.UUID      `json:"id"`
	Kind   string         `json:"kind"` // router_sync | suspend | reactivate | payment_match | send_stk | create_package
	Title  string         `json:"title"`
	Detail string         `json:"detail"`
	Target map[string]any `json:"target"`
}

func proposed(t turn, p Proposal) (any, error) {
	p.ID = uuid.New()
	t.emit(Event{Type: "proposal", Proposal: &p})
	return map[string]any{"shown_to_owner": true, "note": "A confirm card is on screen. Nothing has changed yet; do not say it is done."}, nil
}

func customerByAccount(ctx context.Context, s *Service, t turn, account string) (customerRow, error) {
	account = strings.ToUpper(strings.TrimSpace(account))
	rows, _, err := s.Customers.ListSubscribers(ctx, t.tenantID, customersFilter("", account))
	if err != nil {
		return customerRow{}, err
	}
	for _, r := range rows {
		if r.PppoeUsername == account {
			return customerRow{ID: r.ID, Account: r.PppoeUsername, Name: r.FullName, Status: r.Status, PlanName: r.PlanName, PriceCents: r.PlanPriceCents}, nil
		}
	}
	return customerRow{}, toolError{fmt.Sprintf("No customer with account %s.", account)}
}

type customerRow struct {
	ID         uuid.UUID
	Account    string
	Name       string
	Status     string
	PlanName   *string
	PriceCents *int32
}

func proposeRouterSync(ctx context.Context, s *Service, t turn, raw json.RawMessage) (any, error) {
	in, err := decode[struct {
		RouterID string `json:"router_id"`
		Reason   string `json:"reason"`
	}](raw)
	if err != nil {
		return nil, err
	}
	r, _, err := findRouter(ctx, s, t, in.RouterID)
	if err != nil {
		return nil, err
	}
	if r.Status == "offline" || r.Status == "pending" {
		return nil, toolError{fmt.Sprintf("%s is %s; a sync needs the router online. Suggest checking power and internet instead.", r.Name, r.Status)}
	}
	return proposed(t, Proposal{Kind: "router_sync", Title: "Sync " + r.Name, Detail: in.Reason, Target: map[string]any{"router_id": r.ID}})
}

func proposeCustomerStatus(ctx context.Context, s *Service, t turn, raw json.RawMessage) (any, error) {
	in, err := decode[struct {
		AccountID string `json:"account_id"`
		Action    string `json:"action"`
		Reason    string `json:"reason"`
	}](raw)
	if err != nil {
		return nil, err
	}
	c, err := customerByAccount(ctx, s, t, in.AccountID)
	if err != nil {
		return nil, err
	}
	switch {
	case in.Action == "suspend" && c.Status != "active":
		return nil, toolError{fmt.Sprintf("%s is %s, not active.", c.Account, c.Status)}
	case in.Action == "reactivate" && c.Status == "active":
		return nil, toolError{fmt.Sprintf("%s is already active.", c.Account)}
	case in.Action != "suspend" && in.Action != "reactivate":
		return nil, toolError{"action must be suspend or reactivate"}
	}
	verb := map[string]string{"suspend": "Suspend", "reactivate": "Reactivate"}[in.Action]
	return proposed(t, Proposal{Kind: in.Action, Title: fmt.Sprintf("%s %s · %s", verb, c.Name, c.Account), Detail: in.Reason,
		Target: map[string]any{"subscriber_id": c.ID, "account_id": c.Account}})
}

func proposePaymentMatch(ctx context.Context, s *Service, t turn, raw json.RawMessage) (any, error) {
	in, err := decode[struct {
		PaymentID string `json:"payment_id"`
		AccountID string `json:"account_id"`
		Reason    string `json:"reason"`
	}](raw)
	if err != nil {
		return nil, err
	}
	unmatched := "unmatched"
	pays, err := s.Payments.Payments(ctx, t.tenantID, &unmatched, 200)
	if err != nil {
		return nil, err
	}
	var amount int32
	var ref string
	found := false
	for _, p := range pays {
		if p.ID.String() == strings.TrimSpace(in.PaymentID) {
			amount, ref, found = p.AmountKES, p.Reference, true
		}
	}
	if !found {
		return nil, toolError{"That payment is not in the unmatched list. Call recent_payments with status unmatched."}
	}
	c, err := customerByAccount(ctx, s, t, in.AccountID)
	if err != nil {
		return nil, err
	}
	return proposed(t, Proposal{Kind: "payment_match", Title: fmt.Sprintf("Credit KSh %d (“%s”) to %s · %s", amount, ref, c.Name, c.Account), Detail: in.Reason,
		Target: map[string]any{"payment_id": in.PaymentID, "subscriber_id": c.ID, "account_id": c.Account}})
}

func proposeSendSTK(ctx context.Context, s *Service, t turn, raw json.RawMessage) (any, error) {
	in, err := decode[struct {
		AccountID string `json:"account_id"`
		Reason    string `json:"reason"`
	}](raw)
	if err != nil {
		return nil, err
	}
	c, err := customerByAccount(ctx, s, t, in.AccountID)
	if err != nil {
		return nil, err
	}
	if c.PriceCents == nil {
		return nil, toolError{c.Account + " has no plan, so there is no price to charge."}
	}
	return proposed(t, Proposal{Kind: "send_stk", Title: fmt.Sprintf("M-Pesa prompt KSh %d to %s · %s", *c.PriceCents/100, c.Name, c.Account), Detail: in.Reason,
		Target: map[string]any{"subscriber_id": c.ID, "account_id": c.Account}})
}

func proposePackage(_ context.Context, s *Service, t turn, raw json.RawMessage) (any, error) {
	in, err := decode[struct {
		Name            string `json:"name"`
		AccessType      string `json:"access_type"`
		PriceKES        int32  `json:"price_kes"`
		DownMbps        int32  `json:"down_mbps"`
		UpMbps          int32  `json:"up_mbps"`
		DurationMinutes int32  `json:"duration_minutes"`
		Reason          string `json:"reason"`
	}](raw)
	if err != nil {
		return nil, err
	}
	name := strings.TrimSpace(in.Name)
	switch {
	case name == "" || len(name) > 40:
		return nil, toolError{"name must be 1-40 characters"}
	case in.PriceKES < 0 || in.PriceKES > 100000:
		return nil, toolError{"price_kes must be between 0 and 100000"}
	case in.DownMbps < 1 || in.UpMbps < 1 || in.DownMbps > 10000 || in.UpMbps > 10000:
		return nil, toolError{"speeds must be between 1 and 10000 Mbps"}
	case in.AccessType == "hotspot" && in.DurationMinutes <= 0:
		return nil, toolError{"hotspot packages need duration_minutes > 0"}
	case in.AccessType == "pppoe" && in.DurationMinutes != 0:
		return nil, toolError{"PPPoE plans are monthly; set duration_minutes to 0"}
	}
	plan := map[string]any{
		"name": name, "access_type": in.AccessType, "price_kes": in.PriceKES, "is_trial": false, "data_cap_mb": nil,
		"bandwidth_down_kbps": in.DownMbps * 1000, "bandwidth_up_kbps": in.UpMbps * 1000, "max_devices": 1, "is_active": true,
		"duration_days": nil, "duration_minutes": nil,
	}
	detail := fmt.Sprintf("KSh %d · %d/%d Mbps", in.PriceKES, in.DownMbps, in.UpMbps)
	if in.AccessType == "hotspot" {
		plan["duration_minutes"] = in.DurationMinutes
		detail += fmt.Sprintf(" · %d min", in.DurationMinutes)
	} else {
		detail += " · monthly"
	}
	return proposed(t, Proposal{Kind: "create_package", Title: "New package: " + name, Detail: detail + " — " + in.Reason, Target: map[string]any{"plan": plan}})
}
