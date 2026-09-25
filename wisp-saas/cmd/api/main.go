// Command api serves the HTTP API, M-Pesa callbacks, router onboarding and
// the captive-portal API. With --role=worker the same binary runs the
// background jobs instead (renewals, STK sweeps, router polls, SMS).
//
// On start the API applies database migrations when MIGRATE_DATABASE_URL
// (the schema owner) is set; DATABASE_URL is the RLS-enforced app role.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
	_ "time/tzdata"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/nabukob/lingarnew/wisp-saas/internal/auth"
	"github.com/nabukob/lingarnew/wisp-saas/internal/billing"
	"github.com/nabukob/lingarnew/wisp-saas/internal/customers"
	"github.com/nabukob/lingarnew/wisp-saas/internal/dashboard"
	"github.com/nabukob/lingarnew/wisp-saas/internal/mpesa"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/config"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/db"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/migrate"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/ratelimit"
	"github.com/nabukob/lingarnew/wisp-saas/internal/portal"
	"github.com/nabukob/lingarnew/wisp-saas/internal/router"
	"github.com/nabukob/lingarnew/wisp-saas/internal/secrets"
	"github.com/nabukob/lingarnew/wisp-saas/internal/session"
	"github.com/nabukob/lingarnew/wisp-saas/internal/sms"
	"github.com/nabukob/lingarnew/wisp-saas/internal/tenant"
	"github.com/nabukob/lingarnew/wisp-saas/internal/worker"
)

func main() {
	role := flag.String("role", "api", "api | worker | migrate")
	flag.Parse()
	level := slog.LevelInfo
	if os.Getenv("LOG_LEVEL") == "debug" {
		level = slog.LevelDebug
	}
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level})))
	if err := run(*role); err != nil {
		slog.Error("stopped", "role", *role, "err", err)
		os.Exit(1)
	}
}

// App holds every service; both roles build it the same way.
type App struct {
	Cfg       config.Config
	DB        *db.DB
	Auth      *auth.Service
	Tenants   *tenant.Service
	Customers *customers.Service
	Billing   *billing.Service
	Routers   *router.Service
	Sessions  *session.Service
	Dashboard *dashboard.Service
	SMS       *sms.Service
}

func build(ctx context.Context, cfg config.Config) (*App, error) {
	database, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("database: %w", err)
	}
	kek, err := secrets.FromConfig(ctx, cfg.KMSKeyID, cfg.LocalKEK)
	if err != nil {
		return nil, err
	}
	return assemble(cfg, database, secrets.NewSealer(kek)), nil
}

func assemble(cfg config.Config, database *db.DB, sealer *secrets.Sealer) *App {
	var provider sms.Provider = sms.LogProvider{}
	if cfg.ATAPIKey != "" {
		provider = sms.NewAfricasTalking(cfg.ATUsername, cfg.ATAPIKey)
	}
	a := &App{Cfg: cfg, DB: database}
	a.SMS = &sms.Service{DB: database, Provider: provider, Sender: cfg.ATSender}
	a.Auth = &auth.Service{DB: database, TTL: cfg.SessionTTL}
	a.Tenants = &tenant.Service{DB: database, Sealer: sealer, Auth: a.Auth}
	a.Routers = &router.Service{DB: database, Sealer: sealer, Cfg: cfg, Alerter: &worker.Alerts{DB: database, SMS: a.SMS}}
	a.Sessions = &session.Service{DB: database, Sealer: sealer, SecretSeed: cfg.RadiusSecretSeed, Kicker: a.Routers}
	a.Customers = &customers.Service{DB: database, Sealer: sealer, Disconnector: a.Sessions}
	a.Billing = &billing.Service{DB: database, Tenants: a.Tenants, Daraja: mpesa.NewClient(), Cfg: cfg, SMS: a.SMS}
	a.Dashboard = &dashboard.Service{DB: database}
	return a
}

func run(role string) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if owner := os.Getenv("MIGRATE_DATABASE_URL"); owner != "" && role != "worker" {
		if err := migrate.Up(owner); err != nil {
			return fmt.Errorf("migrate: %w", err)
		}
		slog.Info("migrations applied")
	}
	if role == "migrate" {
		return nil
	}
	if err := cfg.RequireFor("api"); err != nil {
		return err
	}
	if cfg.IsProduction() && cfg.MpesaEnv == "production" && os.Getenv("SAFARICOM_PLATFORM_APPROVED") != "yes" {
		slog.Warn("platform M-Pesa mode needs written Safaricom approval before production use (set SAFARICOM_PLATFORM_APPROVED=yes once you have it)")
	}
	app, err := build(ctx, cfg)
	if err != nil {
		return err
	}
	defer app.DB.Close()

	switch role {
	case "worker":
		w := &worker.Worker{DB: app.DB, SMS: app.SMS, Disconnector: app.Sessions, Sweeper: app.Billing, Poller: app.Routers, PortalURL: app.Routers.PortalURL}
		slog.Info("worker started")
		w.Run(ctx)
		return nil
	case "api":
		return serve(ctx, app)
	}
	return fmt.Errorf("unknown role %q (use api, worker or migrate)", role)
}

// cors allows the dashboard origins to call the API with a bearer token.
func cors(origins []string) func(http.Handler) http.Handler {
	allowed := map[string]bool{}
	for _, o := range origins {
		allowed[strings.TrimRight(o, "/")] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if o := r.Header.Get("Origin"); allowed[o] {
				w.Header().Set("Access-Control-Allow-Origin", o)
				w.Header().Set("Vary", "Origin")
				w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Max-Age", "600")
			}
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		next.ServeHTTP(w, r)
	})
}

// Handler builds the full router. Exported shape kept small for tests.
func Handler(app *App) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.Recoverer, httpx.Logger, securityHeaders, cors(app.Cfg.AllowedOrigins))

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := app.DB.Pool.Ping(ctx); err != nil {
			httpx.Fail(w, r, httpx.NewError(http.StatusServiceUnavailable, "DB_DOWN", "Database unreachable.", "Check DATABASE_URL and that Postgres is up."))
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	authLimit := ratelimit.New(20, 10)
	publicLimit := ratelimit.New(120, 30)
	ip := app.Billing.ClientIP

	// Public: sign-up/login (rate limited), M-Pesa callbacks (IP allowlist +
	// URL token), router onboarding (one-time token), captive portal.
	r.Group(func(r chi.Router) {
		r.Use(authLimit.Middleware(ip))
		app.Tenants.PublicRoutes(r)
	})
	app.Billing.CallbackRoutes(r)
	r.Group(func(r chi.Router) {
		r.Use(publicLimit.Middleware(ip))
		app.Routers.OnboardRoutes(r)
	})
	(&portal.Handler{DB: app.DB, Billing: app.Billing, Limiter: publicLimit}).Routes(r)

	// Dashboard API.
	r.Group(func(r chi.Router) {
		r.Use(app.Auth.Require)
		app.Tenants.Routes(r)
		app.Customers.Routes(r)
		app.Billing.Routes(r)
		app.Routers.Routes(r)
		app.Dashboard.Routes(r)
	})

	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		httpx.Fail(w, r, httpx.NotFound("This endpoint"))
	})
	return r
}

func serve(ctx context.Context, app *App) error {
	srv := &http.Server{
		Addr:              app.Cfg.HTTPAddr,
		Handler:           Handler(app),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}
	go func() {
		<-ctx.Done()
		sctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()
		_ = srv.Shutdown(sctx)
	}()
	slog.Info("api listening", "addr", app.Cfg.HTTPAddr)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
