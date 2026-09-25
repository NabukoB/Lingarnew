// Command radius is the rlm_rest backend FreeRADIUS forwards every request
// to. It runs next to FreeRADIUS (same pod / network namespace) and must stay
// up during api deploys: customers can't log in without it.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/config"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/db"
	"github.com/nabukob/lingarnew/wisp-saas/internal/router"
	"github.com/nabukob/lingarnew/wisp-saas/internal/secrets"
	"github.com/nabukob/lingarnew/wisp-saas/internal/session"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))
	if err := run(); err != nil {
		slog.Error("radius stopped", "err", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	if err := cfg.RequireFor("radius"); err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	database, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer database.Close()
	kek, err := secrets.FromConfig(ctx, cfg.KMSKeyID, cfg.LocalKEK)
	if err != nil {
		return err
	}
	sealer := secrets.NewSealer(kek)
	routers := &router.Service{DB: database, Sealer: sealer, Cfg: cfg}
	svc := &session.Service{DB: database, Sealer: sealer, SecretSeed: cfg.RadiusSecretSeed, Kicker: routers}

	addr := os.Getenv("RADIUS_HTTP_ADDR")
	if addr == "" {
		addr = "127.0.0.1:8081"
	}
	srv := &http.Server{Addr: addr, Handler: svc.Handler(cfg.RadiusAPIToken), ReadHeaderTimeout: 5 * time.Second, WriteTimeout: 15 * time.Second}
	go func() {
		<-ctx.Done()
		sctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = srv.Shutdown(sctx)
	}()
	slog.Info("radius backend listening", "addr", addr)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
