// Command mikrotik-mock serves a fake RouterOS v7 REST API for local dev.
//
//	MOCK_ADDR=:8443 MOCK_USER=wisp-api MOCK_PASSWORD=secret go run ./mocks/mikrotik-mock/cmd/mikrotik-mock
package main

import (
	"log"
	"net/http"
	"os"

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
	addr := env("MOCK_ADDR", ":8443")
	log.Printf("mikrotik-mock on %s (user %s)", addr, r.User)
	if cert, key := os.Getenv("MOCK_TLS_CERT"), os.Getenv("MOCK_TLS_KEY"); cert != "" {
		log.Fatal(http.ListenAndServeTLS(addr, cert, key, r))
	}
	log.Fatal(http.ListenAndServe(addr, r))
}
