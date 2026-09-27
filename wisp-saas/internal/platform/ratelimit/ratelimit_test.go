package ratelimit

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLimiter(t *testing.T) {
	l := New(60, 2) // 1/s, burst 2
	if !l.Allow("a") || !l.Allow("a") {
		t.Fatal("burst should pass")
	}
	if l.Allow("a") {
		t.Fatal("third request should be limited")
	}
	if !l.Allow("b") {
		t.Fatal("keys are independent")
	}
	h := l.Middleware(func(r *http.Request) string { return "c" })(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	codes := []int{}
	for i := 0; i < 3; i++ {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest("GET", "/", nil))
		codes = append(codes, rec.Code)
	}
	if codes[2] != http.StatusTooManyRequests {
		t.Fatalf("codes %v", codes)
	}
}
