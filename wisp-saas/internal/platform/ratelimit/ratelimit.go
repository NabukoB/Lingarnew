// Package ratelimit is a small per-key token bucket for public endpoints.
package ratelimit

import (
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"

	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
)

type Limiter struct {
	mu      sync.Mutex
	perSec  rate.Limit
	burst   int
	buckets map[string]*entry
}

type entry struct {
	l    *rate.Limiter
	seen time.Time
}

func New(perMinute float64, burst int) *Limiter {
	l := &Limiter{perSec: rate.Limit(perMinute / 60), burst: burst, buckets: map[string]*entry{}}
	go l.gc()
	return l
}

func (l *Limiter) Allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	e, ok := l.buckets[key]
	if !ok {
		e = &entry{l: rate.NewLimiter(l.perSec, l.burst)}
		l.buckets[key] = e
	}
	e.seen = time.Now()
	return e.l.Allow()
}

func (l *Limiter) gc() {
	for range time.Tick(5 * time.Minute) {
		l.mu.Lock()
		for k, e := range l.buckets {
			if time.Since(e.seen) > 10*time.Minute {
				delete(l.buckets, k)
			}
		}
		l.mu.Unlock()
	}
}

// Middleware limits requests by keyFn(r).
func (l *Limiter) Middleware(keyFn func(*http.Request) string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !l.Allow(keyFn(r)) {
				w.Header().Set("Retry-After", "30")
				httpx.Fail(w, r, httpx.NewError(http.StatusTooManyRequests, "SLOW_DOWN", "Too many tries.", "Wait 30 seconds and try again."))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
