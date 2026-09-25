//go:build e2e

// End-to-end RADIUS test: a real FreeRADIUS (infra/docker/freeradius.Dockerfile,
// image "wisp-freeradius") proxies to the Go backend through rlm_rest, and a
// radclient container plays the MikroTik router.
//
//	docker build -f infra/docker/freeradius.Dockerfile -t wisp-freeradius .
//	go test -tags e2e ./tests/e2e/
package e2e

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/netip"
	"os/exec"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/nabukob/lingarnew/wisp-saas/internal/customers"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/config"
	"github.com/nabukob/lingarnew/wisp-saas/internal/router"
	"github.com/nabukob/lingarnew/wisp-saas/internal/session"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil"
	"github.com/nabukob/lingarnew/wisp-saas/internal/testutil/fixtures"
)

const (
	subnet  = "172.30.77.0/24"
	gateway = "172.30.77.1"
	netName = "wisp-e2e-radius"
	token   = "e2e-token"
	seed    = "e2e-seed"
)

func docker(t *testing.T, args ...string) string {
	t.Helper()
	out, err := exec.Command("docker", args...).CombinedOutput()
	if err != nil {
		t.Fatalf("docker %s: %v\n%s", strings.Join(args, " "), err, out)
	}
	return string(out)
}

func TestRadiusThroughFreeRADIUS(t *testing.T) {
	if err := exec.Command("docker", "image", "inspect", "wisp-freeradius").Run(); err != nil {
		t.Skip("build the wisp-freeradius image first")
	}
	ctx := context.Background()
	d := testutil.DB(t)
	sealer := testutil.Sealer(t)
	tn := fixtures.Tenant(t, d, sealer, "E2E Radius WiFi")

	var loc uuid.UUID
	_ = d.WithTenant(ctx, tn.ID, func(q *store.Queries) error {
		ls, err := q.ListLocations(ctx)
		loc = ls[0].ID
		return err
	})
	rs := &router.Service{DB: d, Sealer: sealer, Cfg: config.Config{WGTunnelCIDR: netip.MustParsePrefix(subnet), PublicAPIURL: "https://api.example.com"}}
	rt, _, err := rs.Create(ctx, tn.ID, router.CreateInput{LocationID: loc, Name: "E2E", PPPoEPorts: []string{"ether2"}})
	if err != nil {
		t.Fatal(err)
	}
	secret := router.RadiusSecret(seed, rt.ID)
	sess := &session.Service{DB: d, Sealer: sealer, SecretSeed: seed}
	cust := &customers.Service{DB: d, Sealer: sealer, Disconnector: sess}
	plan := fixtures.Plan(t, d, tn.ID, "pppoe", "")
	sub, pw, err := cust.CreateSubscriber(ctx, tn.ID, customers.SubscriberInput{FullName: "E2E", Phone: "0712999000", PlanID: &plan.ID, StartNow: true})
	if err != nil {
		t.Fatal(err)
	}
	late, _, err := cust.CreateSubscriber(ctx, tn.ID, customers.SubscriberInput{FullName: "Late", Phone: "0712999001", PlanID: &plan.ID})
	if err != nil {
		t.Fatal(err)
	}

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	go func() { _ = http.Serve(ln, sess.Handler(token)) }()
	backend := "http://" + ln.Addr().String()

	_ = exec.Command("docker", "network", "rm", netName).Run()
	docker(t, "network", "create", "--subnet", subnet, "--gateway", gateway, netName)
	t.Cleanup(func() { _ = exec.Command("docker", "network", "rm", netName).Run() })
	name := "wisp-e2e-freeradius"
	_ = exec.Command("docker", "rm", "-f", name).Run()
	docker(t, "run", "-d", "--name", name, "--network", "host",
		"-e", "RADIUS_BACKEND_URL="+backend, "-e", "RADIUS_API_TOKEN="+token, "-e", "WG_TUNNEL_CIDR="+subnet,
		"wisp-freeradius", "-X")
	t.Cleanup(func() {
		if t.Failed() {
			out, _ := exec.Command("docker", "logs", "--tail", "120", name).CombinedOutput()
			t.Logf("freeradius log:\n%s", out)
		}
		_ = exec.Command("docker", "rm", "-f", name).Run()
	})
	time.Sleep(2 * time.Second)

	// radclient runs "on the router": its source address is the router's tunnel IP.
	radclient := func(port, kind, attrs string) string {
		cmd := exec.Command("docker", "run", "--rm", "-i", "--network", netName, "--ip", rt.TunnelIp.String(),
			"--entrypoint", "radclient", "wisp-freeradius", "-x", "-r", "2", "-t", "3", gateway+":"+port, kind, secret)
		cmd.Stdin = strings.NewReader(attrs)
		out, _ := cmd.CombinedOutput()
		return string(out)
	}
	pap := func(user, pass string) string {
		return radclient("1812", "auth", fmt.Sprintf("User-Name = %q\nUser-Password = %q\nService-Type = Framed-User\nFramed-Protocol = PPP\n", user, pass))
	}

	out := pap(sub.PppoeUsername, pw)
	if !strings.Contains(out, "Access-Accept") || !strings.Contains(out, "Mikrotik-Rate-Limit") || !strings.Contains(out, "Session-Timeout") {
		t.Fatalf("PAP accept expected:\n%s", out)
	}
	if out := pap(sub.PppoeUsername, "wrong-password"); !strings.Contains(out, "Access-Reject") {
		t.Fatalf("wrong password must reject:\n%s", out)
	}
	out = pap(late.PppoeUsername, "whatever")
	if !strings.Contains(out, "Access-Reject") || !strings.Contains(out, "Paybill 123456") {
		t.Fatalf("expired must reject with pay message:\n%s", out)
	}
	// CHAP (radclient computes CHAP-Password from Cleartext-Password).
	out = radclient("1812", "auth", fmt.Sprintf("User-Name = %q\nCHAP-Password = %q\n", sub.PppoeUsername, pw))
	if !strings.Contains(out, "Access-Accept") {
		t.Fatalf("CHAP accept expected:\n%s", out)
	}
	// MS-CHAPv2 (MikroTik PPPoE default) via radtest.
	cmd := exec.Command("docker", "run", "--rm", "--network", netName, "--ip", rt.TunnelIp.String(),
		"--entrypoint", "radtest", "wisp-freeradius", "-t", "mschap", sub.PppoeUsername, pw, gateway, "0", secret)
	mout, _ := cmd.CombinedOutput()
	if !strings.Contains(string(mout), "Access-Accept") {
		t.Fatalf("MS-CHAP accept expected:\n%s", mout)
	}

	out = radclient("1813", "acct", fmt.Sprintf("Acct-Status-Type = Start\nUser-Name = %q\nAcct-Session-Id = \"e2e-1\"\nFramed-IP-Address = 172.21.0.44\n", sub.PppoeUsername))
	if !strings.Contains(out, "Accounting-Response") {
		t.Fatalf("accounting response expected:\n%s", out)
	}
	_ = d.WithTenant(ctx, tn.ID, func(q *store.Queries) error {
		s, err := q.GetActiveSession(ctx, store.GetActiveSessionParams{RouterID: rt.ID, AcctSessionID: "e2e-1"})
		if err != nil || s.Status != "active" {
			t.Fatalf("session not recorded: %+v %v", s, err)
		}
		return nil
	})

	// A packet from an address that isn't a router is dropped.
	cmd = exec.Command("docker", "run", "--rm", "-i", "--network", netName, "--ip", "172.30.77.200",
		"--entrypoint", "radclient", "wisp-freeradius", "-r", "1", "-t", "2", gateway+":1812", "auth", secret)
	cmd.Stdin = strings.NewReader(fmt.Sprintf("User-Name = %q\nUser-Password = %q\n", sub.PppoeUsername, pw))
	if out, _ := cmd.CombinedOutput(); strings.Contains(string(out), "Access-Accept") {
		t.Fatalf("unknown NAS was accepted:\n%s", out)
	}
}
