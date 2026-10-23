// Package admin is our own back office: every WISP's trial or subscription,
// routers and SMS credits, platform income, and problems across the platform.
//
// It runs on its own Postgres pool (ADMIN_DATABASE_URL) as a login role in
// wisp_platform, the only role that can read across tenants, and only the
// columns the console needs. Staff sign in with a password and a 6-digit
// authenticator code (TOTP); every change is written to admin_audit.
package admin

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/mail"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"

	"github.com/nabukob/lingarnew/wisp-saas/internal/auth"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/db"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/random"
	"github.com/nabukob/lingarnew/wisp-saas/internal/secrets"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
)

const (
	issuer     = "Mtandao Admin"
	sessionTTL = 12 * time.Hour
)

var totpOpts = totp.ValidateOpts{Period: 30, Digits: otp.DigitsSix, Algorithm: otp.AlgorithmSHA1}

type Service struct {
	DB     *db.DB // the wisp_platform pool, never the app pool
	Sealer *secrets.Sealer
	Now    func() time.Time
}

func (s *Service) now() time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

func (s *Service) tx(ctx context.Context, fn func(q *store.Queries) error) error {
	return s.DB.WithoutTenant(ctx, fn)
}

func totpField(id uuid.UUID) secrets.Field {
	return secrets.Field{Table: "platform_admins", Column: "totp_secret_enc", RowID: id}
}

// Enrollment is what a new admin adds to their authenticator app.
type Enrollment struct {
	AdminID uuid.UUID
	Secret  string // base32, for manual entry
	URL     string // otpauth://… for a QR code
}

// CreateAdmin adds a staff account. Run it from the command line only.
func (s *Service) CreateAdmin(ctx context.Context, email, name, password string) (Enrollment, error) {
	email = strings.TrimSpace(email)
	if _, err := mail.ParseAddress(email); err != nil {
		return Enrollment{}, fmt.Errorf("%q is not an email address", email)
	}
	if len(password) < 12 {
		return Enrollment{}, errors.New("admin passwords need at least 12 characters")
	}
	if strings.TrimSpace(name) == "" {
		name = email
	}
	hash, err := auth.HashPassword(password)
	if err != nil {
		return Enrollment{}, err
	}
	key, err := totp.Generate(totp.GenerateOpts{Issuer: issuer, AccountName: email})
	if err != nil {
		return Enrollment{}, err
	}
	id := uuid.New()
	dek, err := s.Sealer.NewDataKey(ctx, id)
	if err != nil {
		return Enrollment{}, err
	}
	sealed, err := s.Sealer.Seal(ctx, id, dek, totpField(id), []byte(key.Secret()))
	if err != nil {
		return Enrollment{}, err
	}
	err = s.tx(ctx, func(q *store.Queries) error {
		return q.CreatePlatformAdmin(ctx, store.CreatePlatformAdminParams{ID: id, Email: email, Name: name, PasswordHash: hash, TotpSecretEnc: sealed, DekWrapped: dek})
	})
	if _, dup := db.UniqueViolation(err); dup {
		return Enrollment{}, fmt.Errorf("an admin with email %s already exists", email)
	}
	return Enrollment{AdminID: id, Secret: key.Secret(), URL: key.URL()}, err
}

// ErrLogin is deliberately the same for a wrong email, password or code.
var ErrLogin = httpx.NewError(http.StatusUnauthorized, "ADMIN_LOGIN_FAILED", "Email, password or code is wrong.", "Check all three and try again; codes change every 30 seconds.")

var (
	dummyOnce sync.Once
	dummyHash string
)

// Login checks password + TOTP and returns a session token.
func (s *Service) Login(ctx context.Context, email, password, code, ip string) (string, time.Time, error) {
	var a store.AdminByEmailRow
	err := s.tx(ctx, func(q *store.Queries) error {
		var err error
		a, err = q.AdminByEmail(ctx, strings.TrimSpace(email))
		return err
	})
	if err != nil && !db.IsNotFound(err) {
		return "", time.Time{}, err
	}
	if db.IsNotFound(err) || a.DisabledAt != nil {
		// Same work as a real check, so timing doesn't reveal which emails exist.
		dummyOnce.Do(func() { dummyHash, _ = auth.HashPassword(random.Token(16)) })
		_, _ = auth.CheckPassword(dummyHash, password)
		return "", time.Time{}, ErrLogin
	}
	if ok, _ := auth.CheckPassword(a.PasswordHash, password); !ok {
		return "", time.Time{}, ErrLogin
	}
	secret, err := s.Sealer.Open(ctx, a.ID, a.DekWrapped, totpField(a.ID), a.TotpSecretEnc)
	if err != nil {
		return "", time.Time{}, err
	}
	step, ok := matchCode(string(secret), strings.TrimSpace(code), s.now())
	if !ok {
		return "", time.Time{}, ErrLogin
	}
	token := random.Token(32)
	exp := s.now().Add(sessionTTL)
	err = s.tx(ctx, func(q *store.Queries) error {
		n, err := q.UseTOTPStep(ctx, store.UseTOTPStepParams{ID: a.ID, Step: step})
		if err != nil {
			return err
		}
		if n == 0 {
			return ErrLogin // code already used
		}
		if err := q.CreateAdminSession(ctx, store.CreateAdminSessionParams{TokenHash: random.Hash(token), AdminID: a.ID, Ip: &ip, ExpiresAt: exp}); err != nil {
			return err
		}
		return audit(ctx, q, a.ID, "LOGIN", nil, map[string]any{"ip": ip})
	})
	return token, exp, err
}

// matchCode accepts the code for the previous, current or next 30s step and
// returns that step.
func matchCode(secret, code string, now time.Time) (int64, bool) {
	if len(code) != 6 {
		return 0, false
	}
	for _, d := range []int64{-1, 0, 1} {
		t := now.Add(time.Duration(d) * 30 * time.Second)
		want, err := totp.GenerateCodeCustom(secret, t, totpOpts)
		if err == nil && subtle.ConstantTimeCompare([]byte(want), []byte(code)) == 1 {
			return t.Unix() / 30, true
		}
	}
	return 0, false
}

// Admin is the signed-in staff member.
type Admin struct {
	ID    uuid.UUID `json:"id"`
	Email string    `json:"email"`
	Name  string    `json:"name"`
}

type ctxKey struct{}

func current(ctx context.Context) Admin {
	a, _ := ctx.Value(ctxKey{}).(Admin)
	return a
}

// Require rejects requests without a live admin session.
func (s *Service) Require(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := auth.BearerToken(r)
		if token == "" {
			httpx.Fail(w, r, httpx.ErrUnauthorized)
			return
		}
		var row store.AdminBySessionRow
		err := s.tx(r.Context(), func(q *store.Queries) error {
			var err error
			row, err = q.AdminBySession(r.Context(), random.Hash(token))
			return err
		})
		if err != nil {
			httpx.Fail(w, r, httpx.ErrUnauthorized)
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, Admin{ID: row.ID, Email: row.Email, Name: row.Name})))
	})
}

func (s *Service) Logout(ctx context.Context, token string) error {
	return s.tx(ctx, func(q *store.Queries) error { return q.DeleteAdminSession(ctx, random.Hash(token)) })
}

func audit(ctx context.Context, q *store.Queries, adminID uuid.UUID, action string, tenantID *uuid.UUID, payload any) error {
	b, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return q.InsertAdminAudit(ctx, store.InsertAdminAuditParams{AdminID: adminID, Action: action, TenantID: tenantID, Payload: b})
}

// ── Reads ─────────────────────────────────────────────────

// Standing is a WISP's subscription as we bill it.
func Standing(status string, trialEnds time.Time, expires *time.Time, now time.Time) string {
	switch status {
	case "trial":
		if now.Before(trialEnds) {
			return "trial"
		}
		return "trial_ended"
	case "active":
		if expires == nil || now.Before(*expires) {
			return "paying"
		}
		return "expired"
	}
	return "lapsed"
}

type IncomeDay struct {
	Day           string `json:"day"`
	Subscriptions int64  `json:"subscriptions_kes"`
	SMSCredits    int64  `json:"sms_credits_kes"`
}

type Overview struct {
	Counts         store.AdminCountsRow           `json:"counts"`
	Income         []IncomeDay                    `json:"income"`
	IncomeMonthKES int64                          `json:"income_30d_kes"`
	OfflineRouters []store.AdminOfflineRoutersRow `json:"offline_routers"`
}

// Overview is the console's front page.
func (s *Service) Overview(ctx context.Context) (Overview, error) {
	var o Overview
	since := s.now().AddDate(0, 0, -30)
	err := s.tx(ctx, func(q *store.Queries) error {
		var err error
		if o.Counts, err = q.AdminCounts(ctx); err != nil {
			return err
		}
		rows, err := q.AdminPlatformIncome(ctx, since)
		if err != nil {
			return err
		}
		byDay := map[string]*IncomeDay{}
		loc, _ := time.LoadLocation("Africa/Nairobi")
		for d := 29; d >= 0; d-- {
			key := s.now().In(loc).AddDate(0, 0, -d).Format("2006-01-02")
			o.Income = append(o.Income, IncomeDay{Day: key})
			byDay[key] = &o.Income[len(o.Income)-1]
		}
		for _, r := range rows {
			day := byDay[r.Day.Time.Format("2006-01-02")]
			if day == nil {
				continue
			}
			kes := r.Cents / 100
			if r.Purpose == "platform_subscription" {
				day.Subscriptions += kes
			} else {
				day.SMSCredits += kes
			}
			o.IncomeMonthKES += kes
		}
		o.OfflineRouters, err = q.AdminOfflineRouters(ctx)
		return err
	})
	return o, err
}

type TenantRow struct {
	store.AdminTenantsRow
	Standing string `json:"standing"`
}

// Tenants lists WISPs, newest first. standing filters on Standing();
// "unpaid" means trial_ended, expired or lapsed.
func (s *Service) Tenants(ctx context.Context, query, standing string) ([]TenantRow, error) {
	var rows []store.AdminTenantsRow
	err := s.tx(ctx, func(q *store.Queries) error {
		var err error
		rows, err = q.AdminTenants(ctx, store.AdminTenantsParams{Q: strings.TrimSpace(query), Lim: 500})
		return err
	})
	out := make([]TenantRow, 0, len(rows))
	for _, r := range rows {
		st := Standing(r.SubscriptionStatus, r.TrialEndsAt, r.SubscriptionExpiresAt, s.now())
		unpaid := st == "trial_ended" || st == "expired" || st == "lapsed"
		if standing != "" && standing != st && !(standing == "unpaid" && unpaid) {
			continue
		}
		out = append(out, TenantRow{AdminTenantsRow: r, Standing: st})
	}
	return out, err
}

type TenantDetail struct {
	store.AdminTenantRow
	Standing         string                                 `json:"standing"`
	Routers          []store.AdminTenantRoutersRow          `json:"routers"`
	PlatformPayments []store.AdminTenantPlatformPaymentsRow `json:"platform_payments"`
	Money30dKES      int64                                  `json:"customer_payments_30d_kes"`
	Payments30d      int32                                  `json:"customer_payments_30d"`
	Audit            []store.ListAdminAuditRow              `json:"audit"`
}

func (s *Service) Tenant(ctx context.Context, id uuid.UUID) (TenantDetail, error) {
	var d TenantDetail
	err := s.tx(ctx, func(q *store.Queries) error {
		var err error
		if d.AdminTenantRow, err = q.AdminTenant(ctx, id); err != nil {
			if db.IsNotFound(err) {
				return httpx.NotFound("That ISP")
			}
			return err
		}
		if d.Routers, err = q.AdminTenantRouters(ctx, id); err != nil {
			return err
		}
		if d.PlatformPayments, err = q.AdminTenantPlatformPayments(ctx, id); err != nil {
			return err
		}
		m, err := q.AdminTenantMoney(ctx, id)
		if err != nil {
			return err
		}
		d.Money30dKES, d.Payments30d = m.Cents/100, m.Payments
		d.Audit, err = q.ListAdminAudit(ctx, store.ListAdminAuditParams{TenantID: &id, Lim: 20})
		return err
	})
	d.Standing = Standing(d.SubscriptionStatus, d.TrialEndsAt, d.SubscriptionExpiresAt, s.now())
	return d, err
}

func (s *Service) Audit(ctx context.Context, limit int32) ([]store.ListAdminAuditRow, error) {
	var rows []store.ListAdminAuditRow
	err := s.tx(ctx, func(q *store.Queries) error {
		var err error
		rows, err = q.ListAdminAudit(ctx, store.ListAdminAuditParams{Lim: limit})
		return err
	})
	return rows, err
}

// ── Changes (each audited in the same transaction) ───────────

func bad(code, msg string) error { return httpx.BadRequest(code, msg, "") }

func (s *Service) ExtendTrial(ctx context.Context, adminID, tenantID uuid.UUID, days int, note string) (store.AdminExtendTrialRow, error) {
	var row store.AdminExtendTrialRow
	if days < 1 || days > 90 {
		return row, bad("BAD_DAYS", "Extend by 1 to 90 days.")
	}
	err := s.tx(ctx, func(q *store.Queries) error {
		var err error
		row, err = q.AdminExtendTrial(ctx, store.AdminExtendTrialParams{Days: int32(days), ID: tenantID})
		if db.IsNotFound(err) {
			return httpx.Conflict("ALREADY_PAYING", "This ISP has a paid subscription; add months instead.", "")
		}
		if err != nil {
			return err
		}
		return audit(ctx, q, adminID, "EXTEND_TRIAL", &tenantID, map[string]any{"days": days, "note": note, "trial_ends_at": row.TrialEndsAt})
	})
	return row, err
}

func (s *Service) AddSubscription(ctx context.Context, adminID, tenantID uuid.UUID, months int, note string) (store.AdminAddSubscriptionRow, error) {
	var row store.AdminAddSubscriptionRow
	if months < 1 || months > 12 {
		return row, bad("BAD_MONTHS", "Add 1 to 12 months.")
	}
	err := s.tx(ctx, func(q *store.Queries) error {
		var err error
		row, err = q.AdminAddSubscription(ctx, store.AdminAddSubscriptionParams{Months: int32(months), ID: tenantID})
		if db.IsNotFound(err) {
			return httpx.NotFound("That ISP")
		}
		if err != nil {
			return err
		}
		return audit(ctx, q, adminID, "ADD_SUBSCRIPTION", &tenantID, map[string]any{"months": months, "note": note, "expires_at": row.SubscriptionExpiresAt})
	})
	return row, err
}

func (s *Service) GrantSMSCredits(ctx context.Context, adminID, tenantID uuid.UUID, credits int, note string) (store.AdminGrantSMSCreditsRow, error) {
	var row store.AdminGrantSMSCreditsRow
	if credits < 1 || credits > 100000 {
		return row, bad("BAD_CREDITS", "Grant 1 to 100,000 credits.")
	}
	if strings.TrimSpace(note) == "" {
		return row, bad("NOTE_REQUIRED", "Say why (e.g. \"refund for failed top-up\").")
	}
	err := s.tx(ctx, func(q *store.Queries) error {
		var err error
		row, err = q.AdminGrantSMSCredits(ctx, store.AdminGrantSMSCreditsParams{Credits: int32(credits), ID: tenantID})
		if db.IsNotFound(err) {
			return httpx.NotFound("That ISP")
		}
		if err != nil {
			return err
		}
		return audit(ctx, q, adminID, "GRANT_SMS_CREDITS", &tenantID, map[string]any{"credits": credits, "note": note, "balance": row.SmsCredits})
	})
	return row, err
}
