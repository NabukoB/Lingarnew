// Package tenant manages WISP accounts: signup, settings and M-Pesa setup.
package tenant

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/mail"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/nabukob/lingarnew/wisp-saas/internal/auth"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/db"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/phone"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/random"
	"github.com/nabukob/lingarnew/wisp-saas/internal/secrets"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
)

type Service struct {
	DB     *db.DB
	Sealer *secrets.Sealer
	Auth   *auth.Service
}

type SignupInput struct {
	Email         string `json:"email"`
	Password      string `json:"password"`
	BusinessName  string `json:"business_name"`
	AccountPrefix string `json:"account_prefix,omitempty"`
	SupportPhone  string `json:"support_phone,omitempty"`
	ShortcodeType string `json:"shortcode_type,omitempty"`
	Shortcode     string `json:"shortcode,omitempty"`
}

var shortcodeRe = regexp.MustCompile(`^\d{5,7}$`)

func bad(code, msg, hint string) error { return httpx.BadRequest(code, msg, hint) }

func (in *SignupInput) validate() error {
	in.Email = strings.TrimSpace(in.Email)
	in.BusinessName = strings.TrimSpace(in.BusinessName)
	in.AccountPrefix = strings.ToUpper(strings.TrimSpace(in.AccountPrefix))
	if _, err := mail.ParseAddress(in.Email); err != nil || !strings.Contains(in.Email, "@") {
		return bad("INVALID_EMAIL", "That email address doesn't look right.", "Use an address like name@example.com.")
	}
	if len(in.Password) < 8 {
		return bad("WEAK_PASSWORD", "Your password is too short.", "Use at least 8 characters.")
	}
	if len(in.BusinessName) < 2 || len(in.BusinessName) > 80 {
		return bad("INVALID_NAME", "Enter your business name.", "Between 2 and 80 characters.")
	}
	if in.AccountPrefix != "" && !prefixRe.MatchString(in.AccountPrefix) {
		return bad("INVALID_PREFIX", "The account prefix must be 2–4 letters.", "For example JZM.")
	}
	if in.SupportPhone != "" {
		p, ok := phone.Normalize(in.SupportPhone)
		if !ok {
			return bad("INVALID_PHONE", "That support phone isn't a Kenyan mobile number.", "Use a number like 0712 345 678.")
		}
		in.SupportPhone = p
	}
	if in.ShortcodeType == "" {
		in.ShortcodeType = "till"
	}
	if in.ShortcodeType != "till" && in.ShortcodeType != "paybill" {
		return bad("INVALID_SHORTCODE_TYPE", "Choose Till or Paybill.", "")
	}
	if in.Shortcode != "" && !shortcodeRe.MatchString(in.Shortcode) {
		return bad("INVALID_SHORTCODE", "Till and Paybill numbers are 5–7 digits.", "Check the number on your M-Pesa statement.")
	}
	return nil
}

func ptr[T any](v T) *T { return &v }

// Signup creates a tenant with starter packages and returns a session token.
func (s *Service) Signup(ctx context.Context, in SignupInput) (store.Tenant, string, error) {
	if err := in.validate(); err != nil {
		return store.Tenant{}, "", err
	}
	id := uuid.New()
	wrapped, err := s.Sealer.NewDataKey(ctx, id)
	if err != nil {
		return store.Tenant{}, "", err
	}
	pw, err := auth.HashPassword(in.Password)
	if err != nil {
		return store.Tenant{}, "", err
	}

	prefixes := []string{in.AccountPrefix}
	if in.AccountPrefix == "" {
		prefixes = PrefixCandidates(in.BusinessName)
	}
	base := Slugify(in.BusinessName)

	var created store.Tenant
	for attempt := 0; attempt < 5; attempt++ {
		prefix, slug, err := s.pickIdentity(ctx, in, prefixes, base)
		if err != nil {
			return store.Tenant{}, "", err
		}
		err = s.DB.WithTenant(ctx, id, func(q *store.Queries) error {
			t, err := q.CreateTenant(ctx, store.CreateTenantParams{
				ID: id, Email: in.Email, PasswordHash: pw, Name: in.BusinessName, Slug: slug,
				AccountPrefix: prefix, CallbackToken: random.Token(32), DekWrapped: wrapped,
				SupportPhone: nilIfEmpty(in.SupportPhone), MpesaShortcodeType: in.ShortcodeType,
				MpesaShortcode: nilIfEmpty(in.Shortcode),
			})
			if err != nil {
				return err
			}
			created = t
			return seedDefaults(ctx, q)
		})
		if name, dup := db.UniqueViolation(err); dup {
			if name == "tenants_email_key" {
				return store.Tenant{}, "", emailTaken()
			}
			continue // lost a race on slug/prefix; pick again
		}
		if err != nil {
			return store.Tenant{}, "", err
		}
		token, _, err := s.Auth.IssueSession(ctx, id)
		return created, token, err
	}
	return store.Tenant{}, "", errors.New("could not reserve a unique slug and prefix")
}

func emailTaken() error {
	return httpx.Conflict("EMAIL_TAKEN", "An account with that email already exists.", "Sign in instead, or use another email.")
}

func (s *Service) pickIdentity(ctx context.Context, in SignupInput, prefixes []string, base string) (string, string, error) {
	var prefix, slug string
	err := s.DB.WithoutTenant(ctx, func(q *store.Queries) error {
		slugs := []string{base}
		for i := 2; i <= 9; i++ {
			slugs = append(slugs, fmt.Sprintf("%s-%d", base, i))
		}
		slugs = append(slugs, base+"-"+strings.ToLower(random.Code(4)))
		for _, sl := range slugs {
			r, err := q.TenantIdentityTaken(ctx, store.TenantIdentityTakenParams{Email: in.Email, Slug: sl, Prefix: "__"})
			if err != nil {
				return err
			}
			if r.EmailTaken {
				return emailTaken()
			}
			if !r.SlugTaken {
				slug = sl
				break
			}
		}
		for _, p := range prefixes {
			r, err := q.TenantIdentityTaken(ctx, store.TenantIdentityTakenParams{Email: in.Email, Slug: "", Prefix: p})
			if err != nil {
				return err
			}
			if !r.PrefixTaken {
				prefix = p
				return nil
			}
		}
		if in.AccountPrefix != "" {
			return httpx.Conflict("PREFIX_TAKEN", "Another ISP already uses the prefix "+in.AccountPrefix+".", "Pick different letters, or leave it blank and we'll suggest one.")
		}
		return errors.New("no free account prefix")
	})
	return prefix, slug, err
}

// seedDefaults adds a first location and starter packages the WISP can edit.
func seedDefaults(ctx context.Context, q *store.Queries) error {
	if _, err := q.CreateLocation(ctx, store.CreateLocationParams{Name: "Main site"}); err != nil {
		return err
	}
	type p struct {
		name       string
		access     string
		kes        int32
		days, mins *int32
		down, up   int32
		devices    int32
	}
	plans := []p{
		{"30 min", "hotspot", 10, nil, ptr[int32](30), 5000, 2000, 1},
		{"3 hrs", "hotspot", 30, nil, ptr[int32](180), 5000, 2000, 1},
		{"1 day", "hotspot", 60, nil, ptr[int32](1440), 5000, 2000, 2},
		{"1 week", "hotspot", 300, nil, ptr[int32](10080), 8000, 3000, 2},
		{"Bronze 5 Mbps", "pppoe", 1500, ptr[int32](30), nil, 5000, 2000, 1},
		{"Silver 10 Mbps", "pppoe", 2000, ptr[int32](30), nil, 10000, 4000, 1},
		{"Gold 20 Mbps", "pppoe", 3500, ptr[int32](30), nil, 20000, 8000, 1},
	}
	for i, x := range plans {
		if _, err := q.CreatePlan(ctx, store.CreatePlanParams{
			Name: x.name, AccessType: x.access, PriceCents: x.kes * 100, DurationDays: x.days, DurationMinutes: x.mins,
			BandwidthDownKbps: x.down, BandwidthUpKbps: x.up, MaxDevices: x.devices, SortOrder: int32(i),
			MikrotikProfileName: ptr(ProfileName(x.name)),
		}); err != nil {
			return err
		}
	}
	return nil
}

// ProfileName makes a RouterOS-safe profile name, e.g. "Bronze 5 Mbps" → "plan_bronze_5_mbps".
func ProfileName(name string) string { return "plan_" + strings.ReplaceAll(Slugify(name), "-", "_") }

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// View is what the dashboard sees (no secrets).
type View struct {
	ID                       uuid.UUID  `json:"id"`
	Email                    string     `json:"email"`
	Name                     string     `json:"name"`
	Slug                     string     `json:"slug"`
	AccountPrefix            string     `json:"account_prefix"`
	SupportPhone             *string    `json:"support_phone"`
	MpesaMode                string     `json:"mpesa_mode"`
	MpesaShortcodeType       string     `json:"mpesa_shortcode_type"`
	MpesaShortcode           *string    `json:"mpesa_shortcode"`
	MpesaStoreNumber         *string    `json:"mpesa_store_number"`
	MpesaEnv                 string     `json:"mpesa_env"`
	MpesaOwnCredentialsSet   bool       `json:"mpesa_own_credentials_set"`
	SMSCredits               int32      `json:"sms_credits"`
	SMSSender                *string    `json:"sms_sender"`
	ReminderSMSEnabled       bool       `json:"reminder_sms_enabled"`
	HotspotExpirySMSEnabled  bool       `json:"hotspot_expiry_sms_enabled"`
	HotspotExpirySMSTemplate *string    `json:"hotspot_expiry_sms_template"`
	SubscriptionStatus       string     `json:"subscription_status"`
	TrialEndsAt              time.Time  `json:"trial_ends_at"`
	SubscriptionExpiresAt    *time.Time `json:"subscription_expires_at"`
	TrialDaysLeft            *int       `json:"trial_days_left"`
	GraceHours               int32      `json:"grace_hours"`
	PortalDomain             *string    `json:"portal_domain"`
	LogoURL                  *string    `json:"logo_url"`
	PrimaryColor             string     `json:"primary_color"`
	Timezone                 string     `json:"timezone"`
}

func ToView(t store.Tenant) View {
	v := View{
		ID: t.ID, Email: t.Email, Name: t.Name, Slug: t.Slug, AccountPrefix: t.AccountPrefix, SupportPhone: t.SupportPhone,
		MpesaMode: t.MpesaMode, MpesaShortcodeType: t.MpesaShortcodeType, MpesaShortcode: t.MpesaShortcode,
		MpesaStoreNumber: t.MpesaStoreNumber, MpesaEnv: t.MpesaEnv, MpesaOwnCredentialsSet: len(t.MpesaCredentialsEnc) > 0,
		SMSCredits: t.SmsCredits, SMSSender: t.SmsSender, ReminderSMSEnabled: t.ReminderSmsEnabled,
		HotspotExpirySMSEnabled: t.HotspotExpirySmsEnabled, HotspotExpirySMSTemplate: t.HotspotExpirySmsTemplate,
		SubscriptionStatus: t.SubscriptionStatus, TrialEndsAt: t.TrialEndsAt, SubscriptionExpiresAt: t.SubscriptionExpiresAt,
		GraceHours: t.GraceHours, PortalDomain: t.PortalDomain, LogoURL: t.LogoUrl, PrimaryColor: t.PrimaryColor, Timezone: t.Timezone,
	}
	if t.SubscriptionStatus == "trial" {
		d := int(time.Until(t.TrialEndsAt).Hours()/24 + 0.999)
		if d < 0 {
			d = 0
		}
		v.TrialDaysLeft = &d
	}
	return v
}

func (s *Service) Get(ctx context.Context, tenantID uuid.UUID) (store.Tenant, error) {
	var t store.Tenant
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		var err error
		t, err = q.GetTenant(ctx)
		return err
	})
	return t, err
}

type SettingsInput struct {
	Name                     string  `json:"name"`
	SupportPhone             string  `json:"support_phone"`
	MpesaMode                string  `json:"mpesa_mode"`
	MpesaShortcodeType       string  `json:"mpesa_shortcode_type"`
	MpesaShortcode           string  `json:"mpesa_shortcode"`
	MpesaStoreNumber         string  `json:"mpesa_store_number"`
	MpesaEnv                 string  `json:"mpesa_env"`
	PrimaryColor             string  `json:"primary_color"`
	LogoURL                  string  `json:"logo_url"`
	PortalDomain             string  `json:"portal_domain"`
	GraceHours               int32   `json:"grace_hours"`
	ReminderSMSEnabled       bool    `json:"reminder_sms_enabled"`
	HotspotExpirySMSEnabled  bool    `json:"hotspot_expiry_sms_enabled"`
	HotspotExpirySMSTemplate *string `json:"hotspot_expiry_sms_template"`
	SMSSender                string  `json:"sms_sender"`
	Timezone                 string  `json:"timezone"`
}

var (
	colorRe  = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)
	domainRe = regexp.MustCompile(`^([a-z0-9-]+\.)+[a-z]{2,}$`)
)

func (s *Service) UpdateSettings(ctx context.Context, tenantID uuid.UUID, in SettingsInput) (store.Tenant, error) {
	in.Name = strings.TrimSpace(in.Name)
	if len(in.Name) < 2 {
		return store.Tenant{}, bad("INVALID_NAME", "Enter your business name.", "")
	}
	if in.SupportPhone != "" {
		p, ok := phone.Normalize(in.SupportPhone)
		if !ok {
			return store.Tenant{}, bad("INVALID_PHONE", "That support phone isn't a Kenyan mobile number.", "Use a number like 0712 345 678.")
		}
		in.SupportPhone = p
	}
	if in.MpesaMode != "platform" && in.MpesaMode != "own" {
		return store.Tenant{}, bad("INVALID_MPESA_MODE", "Choose how M-Pesa is set up.", "Use platform unless you have your own Daraja app.")
	}
	if in.MpesaShortcodeType != "till" && in.MpesaShortcodeType != "paybill" {
		return store.Tenant{}, bad("INVALID_SHORTCODE_TYPE", "Choose Till or Paybill.", "")
	}
	for _, sc := range []string{in.MpesaShortcode, in.MpesaStoreNumber} {
		if sc != "" && !shortcodeRe.MatchString(sc) {
			return store.Tenant{}, bad("INVALID_SHORTCODE", "Till and Paybill numbers are 5–7 digits.", "")
		}
	}
	if in.MpesaEnv == "" {
		in.MpesaEnv = "sandbox"
	}
	if in.MpesaEnv != "sandbox" && in.MpesaEnv != "production" {
		return store.Tenant{}, bad("INVALID_MPESA_ENV", "M-Pesa environment must be sandbox or production.", "")
	}
	if in.PrimaryColor == "" {
		in.PrimaryColor = "#2563eb"
	}
	if !colorRe.MatchString(in.PrimaryColor) {
		return store.Tenant{}, bad("INVALID_COLOR", "Brand colour must be a hex colour like #2563eb.", "")
	}
	in.PortalDomain = strings.ToLower(strings.TrimSpace(in.PortalDomain))
	if in.PortalDomain != "" && !domainRe.MatchString(in.PortalDomain) {
		return store.Tenant{}, bad("INVALID_DOMAIN", "Portal domain should look like portal.yourisp.co.ke.", "")
	}
	if in.GraceHours < 0 || in.GraceHours > 168 {
		return store.Tenant{}, bad("INVALID_GRACE", "Grace period must be 0–168 hours.", "")
	}
	if in.HotspotExpirySMSTemplate != nil && len(*in.HotspotExpirySMSTemplate) > 300 {
		return store.Tenant{}, bad("TEMPLATE_TOO_LONG", "Keep the SMS under 300 characters.", "Longer messages cost more than one credit each.")
	}
	if in.SMSSender != "" && len(in.SMSSender) > 11 {
		return store.Tenant{}, bad("INVALID_SENDER", "SMS sender IDs are at most 11 characters.", "")
	}
	if in.Timezone == "" {
		in.Timezone = "Africa/Nairobi"
	}
	if _, err := time.LoadLocation(in.Timezone); err != nil {
		return store.Tenant{}, bad("INVALID_TIMEZONE", "Unknown time zone "+in.Timezone+".", "Use a name like Africa/Nairobi.")
	}

	var out store.Tenant
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		cur, err := q.GetTenant(ctx)
		if err != nil {
			return err
		}
		if in.MpesaMode == "own" && len(cur.MpesaCredentialsEnc) == 0 {
			return bad("MPESA_CREDENTIALS_MISSING", "Add your Daraja keys before switching to your own M-Pesa app.", "Settings → M-Pesa → Use my own Daraja app.")
		}
		out, err = q.UpdateTenantSettings(ctx, store.UpdateTenantSettingsParams{
			Name: in.Name, SupportPhone: nilIfEmpty(in.SupportPhone), MpesaMode: in.MpesaMode,
			MpesaShortcodeType: in.MpesaShortcodeType, MpesaShortcode: nilIfEmpty(in.MpesaShortcode),
			MpesaStoreNumber: nilIfEmpty(in.MpesaStoreNumber), MpesaEnv: in.MpesaEnv, PrimaryColor: in.PrimaryColor,
			LogoUrl: nilIfEmpty(in.LogoURL), PortalDomain: nilIfEmpty(in.PortalDomain), GraceHours: in.GraceHours,
			ReminderSmsEnabled: in.ReminderSMSEnabled, HotspotExpirySmsEnabled: in.HotspotExpirySMSEnabled,
			HotspotExpirySmsTemplate: in.HotspotExpirySMSTemplate, SmsSender: nilIfEmpty(in.SMSSender), Timezone: in.Timezone,
		})
		return err
	})
	if _, dup := db.UniqueViolation(err); dup {
		return store.Tenant{}, httpx.Conflict("DOMAIN_TAKEN", "Another ISP already uses that portal domain.", "")
	}
	return out, err
}

// MpesaCredentials are a WISP's own Daraja keys (mpesa_mode = own).
type MpesaCredentials struct {
	ConsumerKey    string `json:"consumer_key"`
	ConsumerSecret string `json:"consumer_secret"`
	Passkey        string `json:"passkey"`
}

func credField(tenantID uuid.UUID) secrets.Field {
	return secrets.Field{Table: "tenants", Column: "mpesa_credentials_enc", RowID: tenantID}
}

func (s *Service) SetMpesaCredentials(ctx context.Context, tenantID uuid.UUID, c MpesaCredentials) error {
	c.ConsumerKey, c.ConsumerSecret, c.Passkey = strings.TrimSpace(c.ConsumerKey), strings.TrimSpace(c.ConsumerSecret), strings.TrimSpace(c.Passkey)
	if c.ConsumerKey == "" || c.ConsumerSecret == "" || c.Passkey == "" {
		return bad("MPESA_CREDENTIALS_INCOMPLETE", "Enter the consumer key, consumer secret and passkey.", "Find them in your app on developer.safaricom.co.ke.")
	}
	return s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		t, err := q.GetTenant(ctx)
		if err != nil {
			return err
		}
		raw, _ := json.Marshal(c)
		sealed, err := s.Sealer.Seal(ctx, tenantID, t.DekWrapped, credField(tenantID), raw)
		if err != nil {
			return err
		}
		return q.SetTenantMpesaCredentials(ctx, sealed)
	})
}

// OwnMpesaCredentials decrypts a tenant's own Daraja keys.
func (s *Service) OwnMpesaCredentials(ctx context.Context, t store.Tenant) (MpesaCredentials, error) {
	var c MpesaCredentials
	if len(t.MpesaCredentialsEnc) == 0 {
		return c, errors.New("tenant has no own M-Pesa credentials")
	}
	raw, err := s.Sealer.Open(ctx, t.ID, t.DekWrapped, credField(t.ID), t.MpesaCredentialsEnc)
	if err != nil {
		return c, err
	}
	err = json.Unmarshal(raw, &c)
	return c, err
}

func (s *Service) ChangePassword(ctx context.Context, tenantID uuid.UUID, current, next string) error {
	if len(next) < 8 {
		return bad("WEAK_PASSWORD", "Your new password is too short.", "Use at least 8 characters.")
	}
	return s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		t, err := q.GetTenant(ctx)
		if err != nil {
			return err
		}
		if ok, _ := auth.CheckPassword(t.PasswordHash, current); !ok {
			return httpx.NewError(http.StatusForbidden, "BAD_PASSWORD", "Your current password is wrong.", "")
		}
		h, err := auth.HashPassword(next)
		if err != nil {
			return err
		}
		return q.SetTenantPassword(ctx, h)
	})
}
