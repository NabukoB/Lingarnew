// Command wg-gateway runs the cloud end of the WireGuard reverse tunnel.
//
// It creates a userspace WireGuard interface (wireguard-go), gives it the
// first address of WG_TUNNEL_CIDR (10.200.0.1/16) and keeps its peers in line
// with the routers table every few seconds. Routers dial out to it; nothing is
// ever opened on the router. Processes sharing this network namespace (api,
// radius) reach routers at their 10.200.x.x addresses.
//
// Needs NET_ADMIN and /dev/net/tun.
package main

import (
	"context"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"golang.zx2c4.com/wireguard/conn"
	"golang.zx2c4.com/wireguard/device"
	"golang.zx2c4.com/wireguard/tun"

	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/config"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/db"
	"github.com/nabukob/lingarnew/wisp-saas/internal/tunnel"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(log)
	if err := run(); err != nil {
		log.Error("wg-gateway stopped", "err", err)
		os.Exit(1)
	}
}

func env(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	if err := cfg.RequireFor("wg-gateway"); err != nil {
		return err
	}
	priv, err := base64.StdEncoding.DecodeString(cfg.WGServerPrivateKey)
	if err != nil || len(priv) != 32 {
		return errors.New("WG_SERVER_PRIVATE_KEY must be a base64 WireGuard key (wg genkey)")
	}
	ifname := env("WG_INTERFACE", "wg0")
	port, _ := strconv.Atoi(env("WG_LISTEN_PORT", "51820"))

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	database, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer database.Close()

	tdev, err := tun.CreateTUN(ifname, device.DefaultMTU)
	if err != nil {
		return fmt.Errorf("create %s (needs NET_ADMIN and /dev/net/tun): %w", ifname, err)
	}
	logger := device.NewLogger(device.LogLevelError, "wg: ")
	dev := device.NewDevice(tdev, conn.NewDefaultBind(), logger)
	defer dev.Close()
	if err := dev.IpcSet(fmt.Sprintf("private_key=%s\nlisten_port=%d\n", hex.EncodeToString(priv), port)); err != nil {
		return err
	}
	if err := dev.Up(); err != nil {
		return err
	}
	addr := fmt.Sprintf("%s/%d", cfg.WGTunnelCIDR.Addr().Next(), cfg.WGTunnelCIDR.Bits())
	for _, args := range [][]string{{"addr", "replace", addr, "dev", ifname}, {"link", "set", ifname, "up"}} {
		if out, err := exec.Command("ip", args...).CombinedOutput(); err != nil {
			return fmt.Errorf("ip %v: %v: %s", args, err, out)
		}
	}
	slog.Info("wireguard up", "interface", ifname, "address", addr, "port", port)

	var lastOK time.Time
	go func() {
		mux := http.NewServeMux()
		mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
			if time.Since(lastOK) > time.Minute {
				http.Error(w, "peer sync is failing", http.StatusServiceUnavailable)
				return
			}
			_, _ = w.Write([]byte("ok"))
		})
		srv := &http.Server{Addr: env("HEALTH_ADDR", ":8082"), Handler: mux, ReadHeaderTimeout: 5 * time.Second}
		if err := srv.ListenAndServe(); err != nil {
			slog.Error("health server", "err", err)
		}
	}()

	every, _ := time.ParseDuration(env("WG_SYNC_INTERVAL", "5s"))
	tick := time.NewTicker(every)
	defer tick.Stop()
	for {
		rctx, cancel := context.WithTimeout(ctx, 10*time.Second)
		added, removed, err := tunnel.Reconcile(rctx, database, dev)
		cancel()
		if err != nil {
			slog.Error("peer sync", "err", err)
		} else {
			lastOK = time.Now()
			if added+removed > 0 {
				slog.Info("peers updated", "added_or_changed", added, "removed", removed)
			}
		}
		select {
		case <-ctx.Done():
			return nil
		case <-tick.C:
		}
	}
}
