// Command mikrotik-mock serves a fake RouterOS v7 REST API for local dev.
//
//	MOCK_ADDR=:8443 MOCK_USER=wisp-api MOCK_PASSWORD=secret go run ./mocks/mikrotik-mock/cmd/mikrotik-mock
package main

import (
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"time"

	mikrotikmock "github.com/nabukob/lingarnew/wisp-saas/mocks/mikrotik-mock"
)

func env(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}

func main() {
	r := mikrotikmock.New(env("MOCK_USER", "wisp-api"), env("MOCK_PASSWORD", "wisp-api"))
	r.Seed("ppp/active", mikrotikmock.Record{"name": "JZM1042", "caller-id": "AA:BB:CC:00:11:22", "address": "172.21.0.10", "uptime": "2h3m", "service": "pppoe"})
	r.Seed("ip/hotspot/active", mikrotikmock.Record{"user": "AA:BB:CC:DD:EE:01", "address": "172.20.0.42", "uptime": "15m"})
	r.Seed("ip/route", mikrotikmock.Record{"dst-address": "0.0.0.0/0", "active": "true", "gateway": "192.168.1.1", "immediate-gw": "192.168.1.1%ether1"})
	r.Seed("ip/neighbor",
		mikrotikmock.Record{"interface": "ether2", "mac-address": "48:A9:8A:00:00:02", "identity": "Tower Beta", "address4": "192.168.50.2", "platform": "MikroTik", "board": "RB5009UG+S+", "version": "7.15.2"},
		mikrotikmock.Record{"interface": "ether4", "mac-address": "24:5A:4C:00:00:09", "identity": "LiteBeam-North", "address4": "192.168.50.9", "platform": "Ubiquiti", "board": "LBE-5AC-Gen2"})
	go traffic(r)
	addr := env("MOCK_ADDR", ":8443")
	log.Printf("mikrotik-mock on %s (user %s)", addr, r.User)
	if cert, key := os.Getenv("MOCK_TLS_CERT"), os.Getenv("MOCK_TLS_KEY"); cert != "" {
		log.Fatal(http.ListenAndServeTLS(addr, cert, key, r))
	}
	log.Fatal(http.ListenAndServe(addr, r))
}

// traffic grows the uplink counters and moves the CPU so dev charts have data.
func traffic(r *mikrotikmock.Router) {
	var rx, tx int64 = 5e9, 8e8
	for {
		rx += 2_500_000 + rand.Int63n(2_500_000) // ~20-40 Mbit/s down
		tx += 250_000 + rand.Int63n(250_000)
		r.Seed("interface",
			mikrotikmock.Record{"name": "ether1", "type": "ether", "rx-byte": strconv.FormatInt(rx, 10), "tx-byte": strconv.FormatInt(tx, 10)},
			mikrotikmock.Record{"name": "wg-saas", "type": "wg", "rx-byte": "0", "tx-byte": "0"})
		res := r.Singleton("system/resource")
		res["cpu-load"] = strconv.Itoa(8 + rand.Intn(25))
		r.SetSingleton("system/resource", res)
		time.Sleep(time.Second)
	}
}
