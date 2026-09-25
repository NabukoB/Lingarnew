// Package config reads process configuration from the environment.
package config

import (
	"fmt"
	"net/netip"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Env      string // development | production
	HTTPAddr string

	DatabaseURL string
	RedisURL    string

	// Secrets: KMS in production, a local key-encryption key in development.
	KMSKeyID string
	LocalKEK string

	PublicAPIURL   string // e.g. https://api.yourwifisaas.com (callbacks + onboarding)
	PortalBaseURL  string // e.g. https://portal.yourwifisaas.com
	DashboardURL   string
	CookieDomain   string
	SessionTTL     time.Duration
	AllowedOrigins []string

	// M-Pesa platform app (mpesa_mode = platform) and callback security.
	MpesaEnv            string // sandbox | production
	MpesaConsumerKey    string
	MpesaConsumerSecret string
	MpesaPasskey        string
	MpesaShortcode      string // our own shortcode, for the WISP subscription + SMS credits
	MpesaAllowedIPs     []netip.Prefix
	TrustProxyHeaders   bool  // read the client IP from CF-Connecting-IP / X-Forwarded-For (behind Cloudflare/ingress)
	SubscriptionPrice   int64 // KES cents per month
	SMSCreditPrice      int64 // KES cents per SMS credit

	// Africa's Talking (platform-level).
	ATUsername string
	ATAPIKey   string
	ATSender   string
	ATSandbox  bool

	// Network.
	WGTunnelCIDR      netip.Prefix
	WGServerPublicKey string
	WGServerEndpoint  string // host:port the routers dial
	WGGatewayURL      string // internal API of cmd/wg-gateway
	WGGatewayToken    string
	RadiusServer      string // hostname routers send RADIUS to (over the tunnel)
	RadiusSecretSeed  string
	RouterAPIPort     int
	RouterAPIInsecure bool // mikrotik-mock and self-signed router certs

	// Internal shared secret for rlm_rest -> cmd/radius.
	RadiusAPIToken string
}

func Load() (Config, error) {
	c := Config{
		Env:                 get("APP_ENV", "development"),
		HTTPAddr:            get("HTTP_ADDR", ":8080"),
		DatabaseURL:         os.Getenv("DATABASE_URL"),
		RedisURL:            os.Getenv("REDIS_URL"),
		KMSKeyID:            os.Getenv("KMS_KEY_ID"),
		LocalKEK:            os.Getenv("LOCAL_KEK"),
		PublicAPIURL:        strings.TrimRight(get("PUBLIC_API_URL", "http://localhost:8080"), "/"),
		PortalBaseURL:       strings.TrimRight(get("PORTAL_BASE_URL", "http://localhost:3010/portal"), "/"),
		DashboardURL:        strings.TrimRight(get("DASHBOARD_URL", "http://localhost:3010"), "/"),
		CookieDomain:        os.Getenv("COOKIE_DOMAIN"),
		SessionTTL:          getDuration("SESSION_TTL", 30*24*time.Hour),
		AllowedOrigins:      getList("ALLOWED_ORIGINS", []string{"http://localhost:3010"}),
		MpesaEnv:            get("MPESA_ENV", "sandbox"),
		MpesaConsumerKey:    os.Getenv("MPESA_PLATFORM_CONSUMER_KEY"),
		MpesaConsumerSecret: os.Getenv("MPESA_PLATFORM_CONSUMER_SECRET"),
		MpesaPasskey:        os.Getenv("MPESA_PLATFORM_PASSKEY"),
		MpesaShortcode:      get("MPESA_PLATFORM_SHORTCODE", "174379"),
		TrustProxyHeaders:   get("TRUST_PROXY_HEADERS", "false") == "true",
		SubscriptionPrice:   int64(getInt("SUBSCRIPTION_PRICE_KES", 1500)) * 100,
		SMSCreditPrice:      int64(getInt("SMS_CREDIT_PRICE_CENTS", 100)),
		ATUsername:          get("AT_USERNAME", "sandbox"),
		ATAPIKey:            os.Getenv("AT_API_KEY"),
		ATSender:            os.Getenv("AT_SENDER"),
		ATSandbox:           get("AT_USERNAME", "sandbox") == "sandbox",
		WGServerPublicKey:   os.Getenv("WG_SERVER_PUBLIC_KEY"),
		WGServerEndpoint:    get("WG_SERVER_ENDPOINT", "vpn.yourwifisaas.com:51820"),
		WGGatewayURL:        strings.TrimRight(get("WG_GATEWAY_URL", "http://localhost:8082"), "/"),
		WGGatewayToken:      os.Getenv("WG_GATEWAY_TOKEN"),
		RadiusServer:        get("RADIUS_SERVER", "10.200.0.1"),
		RadiusSecretSeed:    os.Getenv("RADIUS_SECRET_SEED"),
		RouterAPIPort:       getInt("ROUTER_API_PORT", 443),
		RouterAPIInsecure:   get("ROUTER_API_INSECURE", "true") == "true",
		RadiusAPIToken:      os.Getenv("RADIUS_API_TOKEN"),
	}
	cidr, err := netip.ParsePrefix(get("WG_TUNNEL_CIDR", "10.200.0.0/16"))
	if err != nil {
		return c, fmt.Errorf("WG_TUNNEL_CIDR: %w", err)
	}
	c.WGTunnelCIDR = cidr.Masked()
	for _, s := range getList("MPESA_ALLOWED_IPS", nil) {
		if !strings.Contains(s, "/") {
			s += "/32"
		}
		p, err := netip.ParsePrefix(s)
		if err != nil {
			return c, fmt.Errorf("MPESA_ALLOWED_IPS: %q is not an IP or CIDR", s)
		}
		c.MpesaAllowedIPs = append(c.MpesaAllowedIPs, p)
	}
	return c, nil
}

// RequireFor returns an error naming every missing variable a component needs.
func (c Config) RequireFor(component string) error {
	var missing []string
	need := func(name, v string) {
		if v == "" {
			missing = append(missing, name)
		}
	}
	need("DATABASE_URL", c.DatabaseURL)
	if c.KMSKeyID == "" && c.LocalKEK == "" {
		missing = append(missing, "KMS_KEY_ID or LOCAL_KEK")
	}
	switch component {
	case "radius":
		need("RADIUS_API_TOKEN", c.RadiusAPIToken)
		need("RADIUS_SECRET_SEED", c.RadiusSecretSeed)
	case "api":
		need("RADIUS_SECRET_SEED", c.RadiusSecretSeed)
		if c.IsProduction() {
			need("WG_SERVER_PUBLIC_KEY", c.WGServerPublicKey)
			need("WG_GATEWAY_TOKEN", c.WGGatewayToken)
			if len(c.MpesaAllowedIPs) == 0 {
				missing = append(missing, "MPESA_ALLOWED_IPS")
			}
		}
	case "wg-gateway":
		need("WG_GATEWAY_TOKEN", c.WGGatewayToken)
	}
	if len(missing) > 0 {
		return fmt.Errorf("%s cannot start: set %s", component, strings.Join(missing, ", "))
	}
	return nil
}

func (c Config) IsProduction() bool { return c.Env == "production" }

func get(key, def string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return def
}

func getInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

func getDuration(key string, def time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return def
}

func getList(key string, def []string) []string {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	var out []string
	for _, s := range strings.Split(v, ",") {
		if s = strings.TrimSpace(s); s != "" {
			out = append(out, s)
		}
	}
	return out
}
