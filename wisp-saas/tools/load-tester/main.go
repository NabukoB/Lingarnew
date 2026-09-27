// Command load-tester fires RADIUS Access-Requests (PAP) and accounting
// Interim-Updates at a FreeRADIUS server and reports throughput and latency.
// Run it from a router's tunnel IP (or a test client whose source address is
// a registered router), e.g.:
//
//	go run ./tools/load-tester -server 10.200.0.1 -secret <router secret> -user JZM1000 -pass <pw> -n 5000 -c 50
package main

import (
	"context"
	"flag"
	"fmt"
	"net"
	"os"
	"sort"
	"sync"
	"sync/atomic"
	"time"

	"layeh.com/radius"
	"layeh.com/radius/rfc2865"
	"layeh.com/radius/rfc2866"
)

func main() {
	server := flag.String("server", "127.0.0.1", "RADIUS server address")
	secret := flag.String("secret", "", "shared secret of the router you are posing as")
	user := flag.String("user", "", "PPPoE username or Hotspot MAC")
	pass := flag.String("pass", "", "password (MAC for Hotspot)")
	n := flag.Int("n", 1000, "requests")
	c := flag.Int("c", 20, "concurrency")
	acct := flag.Bool("acct", false, "also send an Interim-Update after each accept")
	flag.Parse()
	if *secret == "" || *user == "" {
		fmt.Fprintln(os.Stderr, "set -secret and -user")
		os.Exit(2)
	}

	var (
		accepts, rejects, errs atomic.Int64
		mu                     sync.Mutex
		lat                    []time.Duration
		wg                     sync.WaitGroup
	)
	jobs := make(chan int)
	start := time.Now()
	for w := 0; w < *c; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range jobs {
				p := radius.New(radius.CodeAccessRequest, []byte(*secret))
				_ = rfc2865.UserName_SetString(p, *user)
				_ = rfc2865.UserPassword_SetString(p, *pass)
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				t0 := time.Now()
				resp, err := radius.Exchange(ctx, p, net.JoinHostPort(*server, "1812"))
				d := time.Since(t0)
				cancel()
				switch {
				case err != nil:
					errs.Add(1)
					continue
				case resp.Code == radius.CodeAccessAccept:
					accepts.Add(1)
				default:
					rejects.Add(1)
				}
				mu.Lock()
				lat = append(lat, d)
				mu.Unlock()
				if *acct && resp.Code == radius.CodeAccessAccept {
					a := radius.New(radius.CodeAccountingRequest, []byte(*secret))
					_ = rfc2865.UserName_SetString(a, *user)
					_ = rfc2866.AcctStatusType_Set(a, rfc2866.AcctStatusType_Value_InterimUpdate)
					_ = rfc2866.AcctSessionID_SetString(a, fmt.Sprintf("load-%d", i))
					ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
					_, _ = radius.Exchange(ctx, a, net.JoinHostPort(*server, "1813"))
					cancel()
				}
			}
		}()
	}
	for i := 0; i < *n; i++ {
		jobs <- i
	}
	close(jobs)
	wg.Wait()
	took := time.Since(start)

	sort.Slice(lat, func(i, j int) bool { return lat[i] < lat[j] })
	pct := func(p float64) time.Duration {
		if len(lat) == 0 {
			return 0
		}
		return lat[int(float64(len(lat)-1)*p)]
	}
	fmt.Printf("requests %d in %s → %.0f/s\n", *n, took.Round(time.Millisecond), float64(*n)/took.Seconds())
	fmt.Printf("accept %d  reject %d  error %d\n", accepts.Load(), rejects.Load(), errs.Load())
	fmt.Printf("latency p50 %s  p95 %s  p99 %s\n", pct(0.5), pct(0.95), pct(0.99))
}
