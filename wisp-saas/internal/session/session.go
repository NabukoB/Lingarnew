// Package session ("session-svc") holds the RADIUS logic behind FreeRADIUS
// rlm_rest: authorize (who may connect, at what speed, for how long),
// accounting (sessions + usage) and disconnects (RFC 5176 CoA with a REST
// fallback). FreeRADIUS itself holds no business logic.
package session

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/netip"
	"time"

	"github.com/google/uuid"
	"layeh.com/radius"
	"layeh.com/radius/rfc2865"
	"layeh.com/radius/rfc2866"

	"github.com/nabukob/lingarnew/wisp-saas/internal/billing"
	"github.com/nabukob/lingarnew/wisp-saas/internal/customers"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/db"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/phone"
	"github.com/nabukob/lingarnew/wisp-saas/internal/router"
	"github.com/nabukob/lingarnew/wisp-saas/internal/routeros"
	"github.com/nabukob/lingarnew/wisp-saas/internal/secrets"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
)

const maxSessionTimeout = 24 * 60 * 60

// Kicker removes a session through the router's REST API.
type Kicker interface {
	Kick(ctx context.Context, tenantID, routerID uuid.UUID, accessType, username string) error
}

type Service struct {
	DB         *db.DB
	Sealer     *secrets.Sealer
	SecretSeed string
	Kicker     Kicker
	CoAPort    int // 3799
	Now        func() time.Time
	// exchange sends a RADIUS packet; tests replace it.
	Exchange func(ctx context.Context, p *radius.Packet, addr string) (*radius.Packet, error)
}

func (s *Service) now() time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

// ErrUnknownNAS means the request did not come from a registered router.
var ErrUnknownNAS = errors.New("unknown NAS")

// Router resolves the tenant from the router's tunnel IP. WireGuard binds each
// tunnel IP to one router key, so the source address can't be spoofed. A
// tenant hint in the request body is never trusted.
func (s *Service) Router(ctx context.Context, nas netip.Addr) (routerID, tenantID uuid.UUID, err error) {
	err = s.DB.WithoutTenant(ctx, func(q *store.Queries) error {
		row, err := q.RouterByTunnelIP(ctx, nas)
		routerID, tenantID = row.RouterID, row.TenantID
		return err
	})
	if db.IsNotFound(err) || (err == nil && routerID == uuid.Nil) {
		return uuid.Nil, uuid.Nil, ErrUnknownNAS
	}
	return routerID, tenantID, err
}

// ClientSecret is the RADIUS secret FreeRADIUS should use for a NAS.
func (s *Service) ClientSecret(ctx context.Context, nas netip.Addr) (uuid.UUID, string, error) {
	rid, _, err := s.Router(ctx, nas)
	if err != nil {
		return uuid.Nil, "", err
	}
	return rid, router.RadiusSecret(s.SecretSeed, rid), nil
}

func timeoutUntil(now, end time.Time) int64 {
	secs := int64(end.Sub(now).Seconds())
	if secs > maxSessionTimeout {
		return maxSessionTimeout
	}
	if secs < 1 {
		return 1
	}
	return secs
}

// Authorize decides an Access-Request.
func (s *Service) Authorize(ctx context.Context, nas netip.Addr, a Attrs) (Reply, error) {
	_, tenantID, err := s.Router(ctx, nas)
	if err != nil {
		if errors.Is(err, ErrUnknownNAS) {
			return Reject("This router is not registered. Run the setup command from the dashboard."), nil
		}
		return nil, err
	}
	user := a.Str("User-Name")
	var reply Reply
	err = s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		if mac := billing.NormalizeMAC(user); mac != "" {
			reply, err = s.authorizeHotspot(ctx, q, user, mac)
		} else {
			reply, err = s.authorizePPPoE(ctx, q, user)
		}
		return err
	})
	return reply, err
}

func (s *Service) authorizeHotspot(ctx context.Context, q *store.Queries, user, mac string) (Reply, error) {
	p, err := q.ActivePurchaseForMAC(ctx, mac)
	if db.IsNotFound(err) {
		return Reject("No active package on this device. Buy a package or enter your M-Pesa code to reconnect."), nil
	}
	if err != nil {
		return nil, err
	}
	if p.DataCapMb != nil && p.StartsAt != nil {
		used, err := q.BytesUsedSince(ctx, store.BytesUsedSinceParams{Username: user, Since: *p.StartsAt})
		if err != nil {
			return nil, err
		}
		if used >= *p.DataCapMb*1_000_000 {
			return Reject("Data for this package is used up. Buy another package to continue."), nil
		}
	}
	// Hotspot logs in with username = password = the device MAC.
	return Accept(user, routeros.RateLimit(p.BandwidthUpKbps, p.BandwidthDownKbps), timeoutUntil(s.now(), *p.ExpiresAt)), nil
}

func (s *Service) authorizePPPoE(ctx context.Context, q *store.Queries, user string) (Reply, error) {
	sub, err := q.GetSubscriberByUsername(ctx, user)
	if db.IsNotFound(err) {
		return Reject(fmt.Sprintf("Unknown account %s. Check the username on your router.", user)), nil
	}
	if err != nil {
		return nil, err
	}
	t, err := q.GetTenant(ctx)
	if err != nil {
		return nil, err
	}
	now := s.now()
	grace := time.Duration(t.GraceHours) * time.Hour
	active := sub.Status == "active" && (sub.NextRenewalAt == nil || sub.NextRenewalAt.Add(grace).After(now))
	if !active {
		return Reject(payMessage(t, sub)), nil
	}
	if sub.PlanID == nil {
		return Reject("No package on this account. Call your provider to choose one."), nil
	}
	plan, err := q.GetPlan(ctx, *sub.PlanID)
	if err != nil {
		return nil, err
	}
	if plan.DataCapMb != nil && sub.NextRenewalAt != nil {
		days := int32(30)
		if plan.DurationDays != nil {
			days = *plan.DurationDays
		}
		used, err := q.BytesUsedSince(ctx, store.BytesUsedSinceParams{Username: sub.PppoeUsername, Since: sub.NextRenewalAt.AddDate(0, 0, -int(days))})
		if err != nil {
			return nil, err
		}
		if used >= *plan.DataCapMb*1_000_000 {
			return Reject("Data for this month is used up. Upgrade your package or wait for renewal."), nil
		}
	}
	pw, err := s.Sealer.Open(ctx, t.ID, t.DekWrapped, customers.PasswordField(sub.ID), sub.PppoePasswordEnc)
	if err != nil {
		return nil, fmt.Errorf("decrypt pppoe password: %w", err)
	}
	timeout := int64(maxSessionTimeout)
	if sub.NextRenewalAt != nil {
		timeout = timeoutUntil(now, sub.NextRenewalAt.Add(grace))
	}
	return Accept(string(pw), routeros.RateLimit(plan.BandwidthUpKbps, plan.BandwidthDownKbps), timeout), nil
}

// payMessage tells an expired PPPoE customer exactly how to pay.
func payMessage(t store.Tenant, sub store.Subscriber) string {
	support := ""
	if t.SupportPhone != nil {
		support = phone.Pretty(*t.SupportPhone)
	}
	switch sub.Status {
	case "suspended":
		if support != "" {
			return "Account suspended. Call " + support + "."
		}
		return "Account suspended. Contact your provider."
	case "cancelled":
		return "Account closed. Contact your provider to reconnect."
	}
	if t.MpesaShortcodeType == "paybill" && t.MpesaShortcode != nil {
		return fmt.Sprintf("Account expired. Pay via M-Pesa Paybill %s, Account: %s", *t.MpesaShortcode, sub.PppoeUsername)
	}
	if support != "" {
		return "Account expired. Call " + support + " to renew."
	}
	return "Account expired. Contact your provider to renew."
}

// Accounting records Start / Interim-Update / Stop and enforces data caps.
func (s *Service) Accounting(ctx context.Context, nas netip.Addr, a Attrs) error {
	routerID, tenantID, err := s.Router(ctx, nas)
	if err != nil {
		return err
	}
	status := accountingStatus(a.Str("Acct-Status-Type"))
	user := a.Str("User-Name")
	sessID := a.Str("Acct-Session-Id")
	in := a.Octets("Acct-Input-Octets", "Acct-Input-Gigawords")
	out := a.Octets("Acct-Output-Octets", "Acct-Output-Gigawords")
	secs := int32(a.Int("Acct-Session-Time"))
	var ip *netip.Addr
	if v, err := netip.ParseAddr(a.Str("Framed-IP-Address")); err == nil {
		ip = &v
	}
	mac := billing.NormalizeMAC(a.Str("Calling-Station-Id"))
	access, overCap := "pppoe", false
	if billing.NormalizeMAC(user) != "" {
		access = "hotspot"
	}

	err = s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		switch status {
		case "Accounting-On", "Accounting-Off":
			return q.CloseRouterSessions(ctx, store.CloseRouterSessionsParams{RouterID: routerID, Cause: "NAS-Reboot"})
		case "Start":
			return s.start(ctx, q, routerID, access, user, sessID, mac, ip)
		case "Interim-Update":
			_, err := q.UpdateSessionCounters(ctx, store.UpdateSessionCountersParams{RouterID: routerID, AcctSessionID: sessID, BytesIn: in, BytesOut: out, SessionTimeSec: secs, Ip: ip})
			if db.IsNotFound(err) { // we missed the Start
				if err := s.start(ctx, q, routerID, access, user, sessID, mac, ip); err != nil {
					return err
				}
				_, err = q.UpdateSessionCounters(ctx, store.UpdateSessionCountersParams{RouterID: routerID, AcctSessionID: sessID, BytesIn: in, BytesOut: out, SessionTimeSec: secs, Ip: ip})
			}
			if err != nil {
				return err
			}
			overCap, err = s.overCap(ctx, q, access, user)
			return err
		case "Stop":
			cause := a.Str("Acct-Terminate-Cause")
			if cause == "" {
				cause = "Unknown"
			}
			return q.StopSession(ctx, store.StopSessionParams{RouterID: routerID, AcctSessionID: sessID, TerminationCause: &cause, BytesIn: in, BytesOut: out, SessionTimeSec: secs})
		}
		return nil
	})
	if err == nil && overCap {
		go func() {
			dctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 20*time.Second)
			defer cancel()
			if err := s.Disconnect(dctx, tenantID, user, "data cap reached"); err != nil {
				slog.Warn("disconnect over cap", "tenant_id", tenantID, "username", user, "err", err)
			}
		}()
	}
	return err
}

func (s *Service) start(ctx context.Context, q *store.Queries, routerID uuid.UUID, access, user, sessID, mac string, ip *netip.Addr) error {
	var planID *uuid.UUID
	if access == "hotspot" {
		if p, err := q.ActivePurchaseForMAC(ctx, billing.NormalizeMAC(user)); err == nil {
			planID = &p.PlanID
		}
	} else if sub, err := q.GetSubscriberByUsername(ctx, user); err == nil {
		planID = sub.PlanID
	}
	var macPtr *string
	if mac != "" {
		macPtr = &mac
	}
	var ipv netip.Addr
	if ip != nil {
		ipv = *ip
	}
	_, err := q.StartSession(ctx, store.StartSessionParams{RouterID: routerID, PlanID: planID, AccessType: access, Username: user, AcctSessionID: sessID, MacAddress: macPtr, IpAddress: ipOrNil(ipv)})
	return err
}

func ipOrNil(a netip.Addr) *netip.Addr {
	if !a.IsValid() {
		return nil
	}
	return &a
}

func (s *Service) overCap(ctx context.Context, q *store.Queries, access, user string) (bool, error) {
	var (
		capMB *int64
		since time.Time
	)
	if access == "hotspot" {
		p, err := q.ActivePurchaseForMAC(ctx, billing.NormalizeMAC(user))
		if err != nil || p.StartsAt == nil {
			return false, nil
		}
		capMB, since = p.DataCapMb, *p.StartsAt
	} else {
		sub, err := q.GetSubscriberByUsername(ctx, user)
		if err != nil || sub.PlanID == nil || sub.NextRenewalAt == nil {
			return false, nil
		}
		plan, err := q.GetPlan(ctx, *sub.PlanID)
		if err != nil {
			return false, nil
		}
		days := 30
		if plan.DurationDays != nil {
			days = int(*plan.DurationDays)
		}
		capMB, since = plan.DataCapMb, sub.NextRenewalAt.AddDate(0, 0, -days)
	}
	if capMB == nil {
		return false, nil
	}
	used, err := q.BytesUsedSince(ctx, store.BytesUsedSinceParams{Username: user, Since: since})
	return used >= *capMB*1_000_000, err
}

// Disconnect kicks every live session of username (implements
// customers.Disconnector). It sends a RADIUS Disconnect-Request to the
// router (UDP 3799 over the tunnel) and falls back to REST. Both are audited.
func (s *Service) Disconnect(ctx context.Context, tenantID uuid.UUID, username, reason string) error {
	var sessions []store.ActiveSessionsForUsernameRow
	var routers []store.Router
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		var err error
		sessions, err = q.ActiveSessionsForUsername(ctx, username)
		if err != nil {
			return err
		}
		if len(sessions) == 0 {
			routers, err = q.OnlineRouters(ctx)
		}
		return err
	})
	if err != nil {
		return err
	}
	var firstErr error
	for _, se := range sessions {
		method, err := "coa", s.coa(ctx, se.TunnelIp, se.RouterID, username, se.AcctSessionID)
		if err != nil && s.Kicker != nil {
			slog.Warn("CoA failed, using REST", "router_id", se.RouterID, "err", err)
			method, err = "rest", s.Kicker.Kick(ctx, tenantID, se.RouterID, se.AccessType, username)
		}
		s.audit(ctx, tenantID, se.RouterID, username, reason, method, err)
		if err != nil && firstErr == nil {
			firstErr = err
		}
	}
	// Accounting may have been lost: make sure no router still has the user.
	for _, r := range routers {
		if s.Kicker == nil {
			break
		}
		access := "pppoe"
		if billing.NormalizeMAC(username) != "" {
			access = "hotspot"
		}
		if err := s.Kicker.Kick(ctx, tenantID, r.ID, access, username); err != nil {
			slog.Warn("REST kick without session", "router_id", r.ID, "err", err)
		}
	}
	return firstErr
}

func (s *Service) coa(ctx context.Context, ip netip.Addr, routerID uuid.UUID, username, acctSessionID string) error {
	p := radius.New(radius.CodeDisconnectRequest, []byte(router.RadiusSecret(s.SecretSeed, routerID)))
	if err := rfc2865.UserName_SetString(p, username); err != nil {
		return err
	}
	if acctSessionID != "" {
		if err := rfc2866.AcctSessionID_SetString(p, acctSessionID); err != nil {
			return err
		}
	}
	port := s.CoAPort
	if port == 0 {
		port = 3799
	}
	cctx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()
	exchange := s.Exchange
	if exchange == nil {
		exchange = func(ctx context.Context, p *radius.Packet, addr string) (*radius.Packet, error) {
			return radius.Exchange(ctx, p, addr)
		}
	}
	resp, err := exchange(cctx, p, net.JoinHostPort(ip.String(), fmt.Sprint(port)))
	if err != nil {
		return err
	}
	if resp.Code != radius.CodeDisconnectACK {
		return fmt.Errorf("router answered %s", resp.Code)
	}
	return nil
}

func (s *Service) audit(ctx context.Context, tenantID, routerID uuid.UUID, username, reason, method string, failure error) {
	payload, _ := json.Marshal(map[string]string{"username": username, "reason": reason, "method": method})
	status, msg := "SUCCESS", (*string)(nil)
	if failure != nil {
		status = "FAILED"
		m := failure.Error()
		msg = &m
	}
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		return q.InsertConfigAudit(ctx, store.InsertConfigAuditParams{RouterID: &routerID, Action: "DISCONNECT_USER", Payload: payload, Status: status, ErrorMessage: msg, InitiatedBy: "system"})
	})
	if err != nil {
		slog.Error("audit disconnect", "err", err)
	}
}
