// Package router ("router-svc") manages MikroTik routers: onboarding over the
// WireGuard reverse tunnel, health polling, config sync and the dashboard
// checklist. All router calls use the RouterOS v7 REST API.
package router

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/config"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/db"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/random"
	"github.com/nabukob/lingarnew/wisp-saas/internal/routeros"
	"github.com/nabukob/lingarnew/wisp-saas/internal/secrets"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
	"github.com/nabukob/lingarnew/wisp-saas/internal/tenant"
)

const (
	DegradedAfter = 3  // missed polls
	OfflineAfter  = 10 // missed polls
	TokenTTL      = 24 * time.Hour
)

// Alerter tells the WISP a router went offline (SMS).
type Alerter interface {
	RouterOffline(ctx context.Context, tenantID uuid.UUID, routerName string, since time.Time)
}

type Service struct {
	DB      *db.DB
	Sealer  *secrets.Sealer
	Cfg     config.Config
	Alerter Alerter
	// Dial returns a REST client for a router. Tests point it at mikrotik-mock.
	Dial func(r store.Router, password string) *routeros.Client
	Now  func() time.Time
}

func (s *Service) now() time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

func (s *Service) dial(r store.Router, password string) *routeros.Client {
	if s.Dial != nil {
		return s.Dial(r, password)
	}
	host := r.TunnelIp.String()
	if s.Cfg.RouterAPIPort != 443 {
		host = net.JoinHostPort(host, fmt.Sprint(s.Cfg.RouterAPIPort))
	}
	return routeros.NewClient("https://"+host, r.ApiUser, password, s.Cfg.RouterAPIInsecure)
}

// ServerIP is the cloud end of the tunnel (first address of WG_TUNNEL_CIDR).
func (s *Service) ServerIP() netip.Addr { return s.Cfg.WGTunnelCIDR.Addr().Next() }

func passwordField(id uuid.UUID) secrets.Field {
	return secrets.Field{Table: "routers", Column: "api_password_enc", RowID: id}
}

// CreateInput is POST /v1/routers.
type CreateInput struct {
	LocationID   uuid.UUID `json:"location_id"`
	Name         string    `json:"name"`
	HotspotPorts []string  `json:"hotspot_ports"`
	PPPoEPorts   []string  `json:"pppoe_ports"`
}

// Setup is the one-time command the WISP pastes into the router terminal.
type Setup struct {
	Command   string    `json:"command"`
	ExpiresAt time.Time `json:"expires_at"`
}

func cleanPorts(in []string) []string {
	out := []string{}
	for _, p := range in {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

func validatePorts(hs, pp []string) error {
	if len(hs)+len(pp) == 0 {
		return httpx.BadRequest("NO_PORTS", "Choose at least one port for Hotspot or PPPoE customers.",
			"Pick the ports your access points or customer cables plug into, e.g. ether2.")
	}
	seen := map[string]bool{}
	for _, p := range append(append([]string{}, hs...), pp...) {
		if !ValidPort(p) {
			return httpx.BadRequest("BAD_PORT", fmt.Sprintf("%q is not a valid port name.", p), "Use the name shown in WinBox → Interfaces, e.g. ether2 or wlan1.")
		}
		if seen[p] {
			return httpx.BadRequest("PORT_TWICE", fmt.Sprintf("Port %s is used for both Hotspot and PPPoE.", p), "Each port serves one kind of customer. Remove it from one list.")
		}
		seen[p] = true
	}
	return nil
}

// Create registers a router, allocates its tunnel IP and returns the setup command.
func (s *Service) Create(ctx context.Context, tenantID uuid.UUID, in CreateInput) (store.Router, Setup, error) {
	in.Name = strings.TrimSpace(in.Name)
	in.HotspotPorts, in.PPPoEPorts = cleanPorts(in.HotspotPorts), cleanPorts(in.PPPoEPorts)
	if in.Name == "" || len(in.Name) > 60 {
		return store.Router{}, Setup{}, httpx.BadRequest("NAME_REQUIRED", "Give the router a name of up to 60 characters.", "Use the site name, e.g. Ruiru Mast.")
	}
	if err := validatePorts(in.HotspotPorts, in.PPPoEPorts); err != nil {
		return store.Router{}, Setup{}, err
	}
	var (
		rt    store.Router
		setup Setup
	)
	id := uuid.New()
	password := random.Password(24)
	for attempt := 0; attempt < 5; attempt++ {
		err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
			t, err := q.GetTenant(ctx)
			if err != nil {
				return err
			}
			if err := tenant.RequireSubscription(t, s.now()); err != nil {
				return err
			}
			if _, err := q.GetLocation(ctx, in.LocationID); err != nil {
				if db.IsNotFound(err) {
					return httpx.NotFound("That location")
				}
				return err
			}
			ip, err := q.AllocateTunnelIP(ctx, s.Cfg.WGTunnelCIDR)
			if err != nil {
				return fmt.Errorf("allocate tunnel ip: %w", err)
			}
			if !ip.IsValid() {
				return httpx.NewError(http.StatusServiceUnavailable, "TUNNEL_FULL", "No tunnel addresses left.", "Contact support to enlarge the tunnel range.")
			}
			sealed, err := s.Sealer.Seal(ctx, tenantID, t.DekWrapped, passwordField(id), []byte(password))
			if err != nil {
				return err
			}
			rt, err = q.CreateRouter(ctx, store.CreateRouterParams{
				ID: id, LocationID: in.LocationID, Name: in.Name, TunnelIp: ip, ApiPasswordEnc: sealed,
				HotspotPorts: in.HotspotPorts, PppoePorts: in.PPPoEPorts,
			})
			if err != nil {
				return err
			}
			setup, err = s.issueToken(ctx, q, id)
			return err
		})
		if c, ok := db.UniqueViolation(err); ok && strings.Contains(c, "tunnel_ip") {
			continue // two routers raced for the same address; take the next one
		}
		return rt, setup, err
	}
	return store.Router{}, Setup{}, errors.New("could not allocate a tunnel address after 5 tries")
}

func (s *Service) issueToken(ctx context.Context, q *store.Queries, routerID uuid.UUID) (Setup, error) {
	if err := q.DeleteUnusedOnboardingTokens(ctx, routerID); err != nil {
		return Setup{}, err
	}
	token := random.Token(32)
	exp := s.now().Add(TokenTTL)
	if err := q.CreateOnboardingToken(ctx, store.CreateOnboardingTokenParams{TokenHash: random.Hash(token), RouterID: routerID, ExpiresAt: exp}); err != nil {
		return Setup{}, err
	}
	u := s.Cfg.PublicAPIURL + "/onboard/" + token
	cmd := fmt.Sprintf(`/tool fetch url="%s" dst-path=wisp-setup.rsc; /import file-name=wisp-setup.rsc`, u)
	return Setup{Command: cmd, ExpiresAt: exp}, nil
}

// NewSetupCommand replaces a router's setup command (e.g. it expired, or the
// router was reset and needs onboarding again).
func (s *Service) NewSetupCommand(ctx context.Context, tenantID, routerID uuid.UUID) (Setup, error) {
	var setup Setup
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		t, err := q.GetTenant(ctx)
		if err != nil {
			return err
		}
		if err := tenant.RequireSubscription(t, s.now()); err != nil {
			return err
		}
		if _, err := q.GetRouter(ctx, routerID); err != nil {
			if db.IsNotFound(err) {
				return httpx.NotFound("That router")
			}
			return err
		}
		setup, err = s.issueToken(ctx, q, routerID)
		return err
	})
	return setup, err
}

// UpdatePorts changes which ports serve customers. The WISP then re-runs a
// new setup command.
func (s *Service) UpdatePorts(ctx context.Context, tenantID, routerID uuid.UUID, name string, hs, pp []string) (store.Router, Setup, error) {
	hs, pp = cleanPorts(hs), cleanPorts(pp)
	if err := validatePorts(hs, pp); err != nil {
		return store.Router{}, Setup{}, err
	}
	var (
		rt    store.Router
		setup Setup
	)
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		t, err := q.GetTenant(ctx)
		if err != nil {
			return err
		}
		if err := tenant.RequireSubscription(t, s.now()); err != nil {
			return err
		}
		rt, err = q.UpdateRouterPorts(ctx, store.UpdateRouterPortsParams{ID: routerID, Name: strings.TrimSpace(name), HotspotPorts: hs, PppoePorts: pp})
		if err != nil {
			if db.IsNotFound(err) {
				return httpx.NotFound("That router")
			}
			return err
		}
		setup, err = s.issueToken(ctx, q, routerID)
		return err
	})
	return rt, setup, err
}

// errExpired etc. are shown on the router terminal.
var (
	msgExpired = "this setup command expired or was already used. In the dashboard open Routers > your router > New setup command, then paste the new command."
	msgUnknown = "this setup command is not valid. Copy it again from the dashboard (Routers > Add router)."
)

type tokenInfo struct {
	TenantID, RouterID uuid.UUID
}

func (s *Service) lookupToken(ctx context.Context, token string) (tokenInfo, string) {
	var row store.LookupOnboardingTokenRow
	err := s.DB.WithoutTenant(ctx, func(q *store.Queries) error {
		var err error
		row, err = q.LookupOnboardingToken(ctx, random.Hash(token))
		return err
	})
	if err != nil {
		return tokenInfo{}, msgUnknown
	}
	if row.Used || !s.now().Before(row.ExpiresAt) {
		return tokenInfo{}, msgExpired
	}
	return tokenInfo{TenantID: row.TenantID, RouterID: row.RouterID}, ""
}

// PortalURL is the captive-portal entry for a tenant.
func (s *Service) PortalURL(t store.Tenant) string {
	if t.PortalDomain != nil && *t.PortalDomain != "" {
		return "https://" + *t.PortalDomain + "/?t=" + url.QueryEscape(t.Slug)
	}
	return s.Cfg.PortalBaseURL + "/?t=" + url.QueryEscape(t.Slug)
}

func hostOf(u string) string {
	p, err := url.Parse(u)
	if err != nil {
		return ""
	}
	return p.Hostname()
}

// WalledGarden lists hosts unpaid hotspot users may reach.
func (s *Service) WalledGarden(t store.Tenant) []string {
	hosts := []string{hostOf(s.Cfg.PortalBaseURL), hostOf(s.Cfg.PublicAPIURL)}
	if t.PortalDomain != nil && *t.PortalDomain != "" {
		hosts = append(hosts, *t.PortalDomain)
	}
	seen := map[string]bool{}
	out := []string{}
	for _, h := range hosts {
		if h != "" && h != "localhost" && !seen[h] {
			seen[h] = true
			out = append(out, h)
		}
	}
	return out
}

// Script renders the setup script for a token. On a bad token it returns a
// script that prints why, because /tool fetch hides HTTP error bodies.
func (s *Service) Script(ctx context.Context, token string) string {
	info, msg := s.lookupToken(ctx, token)
	if msg != "" {
		return ErrorScript(msg)
	}
	var out string
	err := s.DB.WithTenant(ctx, info.TenantID, func(q *store.Queries) error {
		t, err := q.GetTenant(ctx)
		if err != nil {
			return err
		}
		rt, err := q.GetRouter(ctx, info.RouterID)
		if err != nil {
			return err
		}
		pw, err := s.Sealer.Open(ctx, t.ID, t.DekWrapped, passwordField(rt.ID), rt.ApiPasswordEnc)
		if err != nil {
			return err
		}
		host, port, err := net.SplitHostPort(s.Cfg.WGServerEndpoint)
		if err != nil {
			return fmt.Errorf("WG_SERVER_ENDPOINT must be host:port: %w", err)
		}
		out, err = RenderScript(ScriptData{
			RouterID: rt.ID.String(), RouterName: rt.Name, TenantName: t.Name,
			Generated: s.now().UTC(), Expires: s.now().Add(TokenTTL).UTC(),
			TunnelIP: rt.TunnelIp.String(), ServerIP: s.ServerIP().String(),
			ServerKey: s.Cfg.WGServerPublicKey, EndpointHost: host, EndpointPort: port,
			APIUser: rt.ApiUser, APIPassword: string(pw),
			RadiusSecret: RadiusSecret(s.Cfg.RadiusSecretSeed, rt.ID),
			HotspotPorts: rt.HotspotPorts, PPPoEPorts: rt.PppoePorts,
			WalledGarden: s.WalledGarden(t), CheckHost: hostOf(s.Cfg.PublicAPIURL),
			FilesURL:    s.Cfg.PublicAPIURL + "/onboard/" + token + "/hotspot",
			CallbackURL: s.Cfg.PublicAPIURL + "/onboard/" + token,
		})
		return err
	})
	if err != nil {
		slog.ErrorContext(ctx, "render setup script", "err", err, "router_id", info.RouterID)
		return ErrorScript("the cloud could not build your script. Try again in a minute; if it keeps failing contact support.")
	}
	return out
}

// HotspotFile renders a captive-portal page for the router behind token.
func (s *Service) HotspotFile(ctx context.Context, token, name string) ([]byte, error) {
	known := false
	for _, f := range HotspotFiles {
		known = known || f == name
	}
	if !known {
		return nil, httpx.NotFound("That page")
	}
	info, msg := s.lookupToken(ctx, token)
	if msg != "" {
		return nil, httpx.NotFound("That setup command")
	}
	var b strings.Builder
	err := s.DB.WithTenant(ctx, info.TenantID, func(q *store.Queries) error {
		t, err := q.GetTenant(ctx)
		if err != nil {
			return err
		}
		return RenderHotspotFile(&b, name, PortalData{TenantName: t.Name, PortalURL: s.PortalURL(t), RouterID: info.RouterID.String()})
	})
	return []byte(b.String()), err
}

// CallbackInput is what the router posts at the end of the script.
type CallbackInput struct {
	PublicKey string `json:"public_key"`
	Serial    string `json:"serial"`
	Version   string `json:"version"`
}

// ValidWireGuardKey reports whether k is a base64 32-byte key.
func ValidWireGuardKey(k string) bool {
	b, err := base64.StdEncoding.DecodeString(k)
	return err == nil && len(b) == 32
}

// Complete finishes onboarding: stores the router's public key so the
// WireGuard gateway adds it as a peer. The token becomes unusable.
func (s *Service) Complete(ctx context.Context, token string, in CallbackInput) error {
	info, msg := s.lookupToken(ctx, token)
	if msg != "" {
		return httpx.NewError(http.StatusGone, "SETUP_EXPIRED", "This setup command expired or was already used.", "Copy a new command from the dashboard.")
	}
	in.PublicKey = strings.TrimSpace(in.PublicKey)
	if !ValidWireGuardKey(in.PublicKey) {
		return httpx.BadRequest("BAD_PUBLIC_KEY", "The router sent an invalid WireGuard key.", "Run the setup command again.")
	}
	return s.DB.WithTenant(ctx, info.TenantID, func(q *store.Queries) error {
		n, err := q.UseOnboardingToken(ctx, random.Hash(token))
		if err != nil {
			return err
		}
		if n == 0 {
			return httpx.NewError(http.StatusGone, "SETUP_EXPIRED", "This setup command was already used.", "Copy a new command from the dashboard.")
		}
		if err := q.SetRouterPublicKey(ctx, store.SetRouterPublicKeyParams{ID: info.RouterID, WgPublicKey: &in.PublicKey}); err != nil {
			if _, ok := db.UniqueViolation(err); ok {
				return httpx.Conflict("KEY_IN_USE", "This router is already connected under another name.", "Delete the other router in the dashboard, then run the command again.")
			}
			return err
		}
		if err := q.SetRouterStatus(ctx, store.SetRouterStatusParams{ID: info.RouterID, Status: "pending"}); err != nil {
			return err
		}
		return audit(ctx, q, info.RouterID, "ONBOARDED", map[string]string{"serial": in.Serial, "version": in.Version}, nil, "system")
	})
}

func audit(ctx context.Context, q *store.Queries, routerID uuid.UUID, action string, payload any, failure error, by string) error {
	b, _ := json.Marshal(payload)
	status, msg := "SUCCESS", (*string)(nil)
	if failure != nil {
		status = "FAILED"
		m := failure.Error()
		msg = &m
	}
	return q.InsertConfigAudit(ctx, store.InsertConfigAuditParams{RouterID: &routerID, Action: action, Payload: b, Status: status, ErrorMessage: msg, InitiatedBy: by})
}

// client loads a router and returns a REST client for it.
func (s *Service) client(ctx context.Context, tenantID, routerID uuid.UUID) (store.Router, *routeros.Client, error) {
	var (
		rt store.Router
		pw []byte
	)
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		t, err := q.GetTenant(ctx)
		if err != nil {
			return err
		}
		rt, err = q.GetRouter(ctx, routerID)
		if err != nil {
			if db.IsNotFound(err) {
				return httpx.NotFound("That router")
			}
			return err
		}
		pw, err = s.Sealer.Open(ctx, tenantID, t.DekWrapped, passwordField(rt.ID), rt.ApiPasswordEnc)
		return err
	})
	if err != nil {
		return rt, nil, err
	}
	return rt, s.dial(rt, string(pw)), nil
}

// Unreachable converts a router error into an actionable API error.
func Unreachable(rt store.Router, err error) error {
	if routeros.Unauthorized(err) {
		return httpx.NewError(http.StatusBadGateway, "ROUTER_AUTH_FAILED", fmt.Sprintf("Router %s rejected our login.", rt.Name),
			"Someone changed or removed the wisp-api user. Open the router and run a new setup command.")
	}
	return httpx.NewError(http.StatusBadGateway, "ROUTER_UNREACHABLE", fmt.Sprintf("Router %s did not respond over the tunnel.", rt.Name),
		"Check the router has internet and that wg-saas shows a recent handshake.")
}

// Poll checks one router's health and records the result.
func (s *Service) Poll(ctx context.Context, tenantID, routerID uuid.UUID) error {
	rt, c, err := s.client(ctx, tenantID, routerID)
	if err != nil {
		return err
	}
	pctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	res, perr := c.Resource(pctx)
	serial := ""
	if perr == nil && (rt.SerialNumber == nil || rt.Status == "pending") {
		serial = c.Serial(pctx)
	}
	cancel()

	var updated store.Router
	err = s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		var err error
		if perr != nil {
			updated, err = q.RecordPollFailure(ctx, store.RecordPollFailureParams{ID: routerID, OfflineAfter: OfflineAfter, DegradedAfter: DegradedAfter})
			return err
		}
		updated, err = q.RecordPollSuccess(ctx, routerID)
		if err != nil {
			return err
		}
		if serial != "" || rt.FirmwareVersion == nil || *rt.FirmwareVersion != res.Version {
			if serial == "" && rt.SerialNumber != nil {
				serial = *rt.SerialNumber
			}
			return q.RecordRouterIdentity(ctx, store.RecordRouterIdentityParams{
				ID: routerID, SerialNumber: nilIfEmpty(serial), BoardName: nilIfEmpty(res.BoardName),
				Architecture: nilIfEmpty(res.Architecture), FirmwareVersion: nilIfEmpty(res.Version),
			})
		}
		return nil
	})
	if err != nil {
		return err
	}
	if perr == nil && rt.Status == "pending" {
		// First contact: make sure the router matches what we expect.
		if _, err := s.Sync(ctx, tenantID, routerID, "system"); err != nil {
			slog.WarnContext(ctx, "first sync failed", "router_id", routerID, "err", err)
		}
	}
	if updated.Status == "offline" && rt.Status != "offline" && s.Alerter != nil {
		s.Alerter.RouterOffline(ctx, tenantID, rt.Name, s.now())
	}
	return nil
}

// PollAll polls every onboarded router with bounded concurrency.
func (s *Service) PollAll(ctx context.Context) error {
	var targets []store.RouterTargetsRow
	if err := s.DB.WithoutTenant(ctx, func(q *store.Queries) error {
		var err error
		targets, err = q.RouterTargets(ctx)
		return err
	}); err != nil {
		return err
	}
	sem := make(chan struct{}, 16)
	var wg sync.WaitGroup
	for _, t := range targets {
		wg.Add(1)
		sem <- struct{}{}
		go func(t store.RouterTargetsRow) {
			defer wg.Done()
			defer func() { <-sem }()
			if err := s.Poll(ctx, t.TenantID, t.RouterID); err != nil {
				slog.WarnContext(ctx, "poll router", "router_id", t.RouterID, "tenant_id", t.TenantID, "err", err)
			}
		}(t)
	}
	wg.Wait()
	return nil
}

// Change is one fix Sync applied.
type Change struct {
	Menu   string `json:"menu"`
	Target string `json:"target"`
}

// Sync pushes the settings the cloud owns (RADIUS client, CoA listener,
// walled garden) and records a config_audit row. It is idempotent.
func (s *Service) Sync(ctx context.Context, tenantID, routerID uuid.UUID, by string) ([]Change, error) {
	rt, c, err := s.client(ctx, tenantID, routerID)
	if err != nil {
		return nil, err
	}
	var t store.Tenant
	if err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		var err error
		t, err = q.GetTenant(ctx)
		return err
	}); err != nil {
		return nil, err
	}
	if by != "system" {
		if err := tenant.RequireSubscription(t, s.now()); err != nil {
			return nil, err
		}
	}
	sctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	changes := []Change{}
	ensure := func(menu string, key map[string]string, fields routeros.Record) error {
		changed, err := c.Ensure(sctx, menu, key, fields)
		if changed {
			var k []string
			for _, v := range key {
				k = append(k, v)
			}
			sort.Strings(k)
			changes = append(changes, Change{Menu: menu, Target: strings.Join(k, " ")})
		}
		return err
	}
	serverIP := s.ServerIP().String()
	syncErr := func() error {
		if err := ensure("radius", map[string]string{"comment": "wisp-saas"}, routeros.Record{
			"address": serverIP, "secret": RadiusSecret(s.Cfg.RadiusSecretSeed, rt.ID),
			"src-address": rt.TunnelIp.String(), "service": "ppp,hotspot",
		}); err != nil {
			return err
		}
		inc, err := c.Get(sctx, "radius/incoming")
		if err != nil {
			return err
		}
		if inc["accept"] != "true" && inc["accept"] != "yes" {
			if err := c.Command(sctx, "radius/incoming/set", routeros.Record{"accept": "yes"}); err != nil {
				return err
			}
			changes = append(changes, Change{Menu: "radius/incoming", Target: "accept"})
		}
		if len(rt.HotspotPorts) > 0 {
			for _, h := range s.WalledGarden(t) {
				if err := ensure("ip/hotspot/walled-garden", map[string]string{"dst-host": h, "comment": "wisp-saas"}, routeros.Record{"action": "allow"}); err != nil {
					return err
				}
				if err := ensure("ip/hotspot/walled-garden/ip", map[string]string{"dst-host": h, "comment": "wisp-saas"}, routeros.Record{"action": "accept"}); err != nil {
					return err
				}
			}
		}
		return nil
	}()
	if syncErr != nil {
		syncErr = Unreachable(rt, syncErr)
	}
	hash := sha256.Sum256([]byte(fmt.Sprintf("%s|%s|%v|%v", serverIP, rt.TunnelIp, s.WalledGarden(t), rt.HotspotPorts)))
	err = s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		if syncErr == nil {
			h := hex.EncodeToString(hash[:8])
			if err := q.MarkConfigPushed(ctx, store.MarkConfigPushedParams{ID: routerID, ConfigHash: &h}); err != nil {
				return err
			}
		}
		return audit(ctx, q, routerID, "PUSH_CONFIG", map[string]any{"changes": changes}, syncErr, by)
	})
	if syncErr != nil {
		return changes, syncErr
	}
	return changes, err
}

// CheckItem is one line of the "what was deployed" checklist.
type CheckItem struct {
	Key   string `json:"key"`
	Label string `json:"label"`
	OK    bool   `json:"ok"`
	Hint  string `json:"hint,omitempty"`
}

// Checklist inspects the router and reports what is in place.
func (s *Service) Checklist(ctx context.Context, tenantID, routerID uuid.UUID) ([]CheckItem, error) {
	rt, c, err := s.client(ctx, tenantID, routerID)
	if err != nil {
		return nil, err
	}
	var plans int32
	if err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		n1, err := q.CountActivePlans(ctx, "pppoe")
		if err != nil {
			return err
		}
		n2, err := q.CountActivePlans(ctx, "hotspot")
		plans = n1 + n2
		return err
	}); err != nil {
		return nil, err
	}
	items := []CheckItem{{Key: "tunnel", Label: "Tunnel", OK: rt.Status == "online" || rt.Status == "degraded",
		Hint: "Waiting for the router to dial home. Check it has internet and allows outbound UDP."}}
	cctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	has := func(menu string, filter map[string]string) bool {
		rows, err := c.List(cctx, menu, filter)
		return err == nil && len(rows) > 0
	}
	if items[0].OK {
		items = append(items, CheckItem{Key: "radius", Label: "RADIUS", OK: has("radius", map[string]string{"comment": "wisp-saas"}), Hint: "Press Sync to restore it."})
		if len(rt.PppoePorts) > 0 {
			items = append(items, CheckItem{Key: "pppoe", Label: "PPPoE server", OK: has("interface/pppoe-server/server", map[string]string{"service-name": "WISP-PPPoE"}), Hint: "Run a new setup command."})
		}
		if len(rt.HotspotPorts) > 0 {
			items = append(items,
				CheckItem{Key: "hotspot", Label: "Hotspot + portal", OK: has("ip/hotspot", map[string]string{"name": "wisp-hotspot"}), Hint: "Run a new setup command."},
				CheckItem{Key: "walled_garden", Label: "Walled garden", OK: has("ip/hotspot/walled-garden", map[string]string{"comment": "wisp-saas"}), Hint: "Press Sync to restore it."})
		}
		rules, err := c.List(cctx, "ip/firewall/filter", nil)
		fw := false
		if err == nil {
			for _, r := range rules {
				if strings.HasPrefix(r["comment"], "wisp-saas") {
					fw = true
					break
				}
			}
		}
		items = append(items, CheckItem{Key: "firewall", Label: "Anti-bypass firewall", OK: fw, Hint: "Run a new setup command."})
	}
	items = append(items, CheckItem{Key: "packages", Label: "Packages", OK: plans > 0, Hint: "Create at least one package under Packages."})
	for i := range items {
		if items[i].OK {
			items[i].Hint = ""
		}
	}
	return items, nil
}

// Kick removes a live session through REST. It is the fallback when a RADIUS
// Disconnect-Request fails.
func (s *Service) Kick(ctx context.Context, tenantID, routerID uuid.UUID, accessType, username string) error {
	rt, c, err := s.client(ctx, tenantID, routerID)
	if err != nil {
		return err
	}
	kctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	menu, key := "ppp/active", "name"
	if accessType == "hotspot" {
		menu, key = "ip/hotspot/active", "user"
	}
	rows, err := c.List(kctx, menu, map[string]string{key: username})
	if err == nil {
		for _, r := range rows {
			if err = c.Command(kctx, menu+"/remove", routeros.Record{".id": r.ID()}); err != nil {
				break
			}
		}
	}
	if err != nil {
		return Unreachable(rt, err)
	}
	return nil
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
