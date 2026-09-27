package httpx

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func body(t *testing.T, rec *httptest.ResponseRecorder) Error {
	t.Helper()
	var out struct{ Error Error }
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("body %q: %v", rec.Body.String(), err)
	}
	return out.Error
}

func TestFail(t *testing.T) {
	r := httptest.NewRequest("GET", "/x", nil)
	cases := []struct {
		err    error
		status int
		code   string
	}{
		{NotFound("That router"), 404, "NOT_FOUND"},
		{BadRequest("BAD", "Bad.", "Fix it."), 400, "BAD"},
		{Conflict("DUP", "Taken.", ""), 409, "DUP"},
		{ErrUnauthorized, 401, "UNAUTHORIZED"},
		{context.DeadlineExceeded, 504, "TIMEOUT"},
		{errors.New("boom"), 500, "INTERNAL"},
	}
	for _, c := range cases {
		rec := httptest.NewRecorder()
		Fail(rec, r, c.err)
		e := body(t, rec)
		if rec.Code != c.status || e.Code != c.code || e.Message == "" {
			t.Errorf("%v → %d %+v", c.err, rec.Code, e)
		}
	}
	if NotFound("That router").Message != "That router was not found." && !strings.Contains(NotFound("That router").Message, "That router") {
		t.Error("NotFound message should name the thing")
	}
	if NewError(418, "T", "m", "h").Error() != "T: m" {
		t.Error("Error()")
	}
}

func TestDecodeAndJSON(t *testing.T) {
	var v struct {
		Name string `json:"name"`
	}
	ok := httptest.NewRequest("POST", "/", strings.NewReader(`{"name":"x"}`))
	if err := Decode(ok, &v); err != nil || v.Name != "x" {
		t.Fatalf("decode: %v %v", v, err)
	}
	unknown := httptest.NewRequest("POST", "/", strings.NewReader(`{"name":"x","extra":1}`))
	if err := Decode(unknown, &v); err == nil {
		t.Fatal("unknown fields must be rejected")
	}
	rec := httptest.NewRecorder()
	JSON(rec, http.StatusCreated, map[string]int{"a": 1})
	if rec.Code != 201 || !strings.HasPrefix(rec.Header().Get("Content-Type"), "application/json") || strings.TrimSpace(rec.Body.String()) != `{"a":1}` {
		t.Fatalf("json: %d %s", rec.Code, rec.Body.String())
	}
}

func TestLogger(t *testing.T) {
	h := Logger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(204) }))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/", nil))
	if rec.Code != 204 {
		t.Fatalf("status %d", rec.Code)
	}
}
