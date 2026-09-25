// Package httpx holds the JSON and error conventions shared by every HTTP
// handler: errors are {"error": {"code", "message", "hint"}} and always say
// what to do next.
package httpx

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5/middleware"
)

type Error struct {
	Status  int    `json:"-"`
	Code    string `json:"code"`
	Message string `json:"message"`
	Hint    string `json:"hint,omitempty"`
}

func (e *Error) Error() string { return e.Code + ": " + e.Message }

func NewError(status int, code, message, hint string) *Error {
	return &Error{Status: status, Code: code, Message: message, Hint: hint}
}

func BadRequest(code, message, hint string) *Error {
	return NewError(http.StatusBadRequest, code, message, hint)
}

func NotFound(what string) *Error {
	return NewError(http.StatusNotFound, "NOT_FOUND", what+" was not found.", "Check the link or refresh the page.")
}

func Conflict(code, message, hint string) *Error {
	return NewError(http.StatusConflict, code, message, hint)
}

var ErrUnauthorized = NewError(http.StatusUnauthorized, "UNAUTHORIZED", "You are not signed in.", "Sign in again.")

func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v != nil {
		_ = json.NewEncoder(w).Encode(v)
	}
}

// Fail writes err. Unknown errors are logged and returned as a generic 500
// that still tells the user what to do.
func Fail(w http.ResponseWriter, r *http.Request, err error) {
	var e *Error
	if !errors.As(err, &e) {
		if errors.Is(err, context.DeadlineExceeded) {
			e = NewError(http.StatusGatewayTimeout, "TIMEOUT", "That took too long.", "Try again in a moment.")
		} else {
			slog.ErrorContext(r.Context(), "request failed", "err", err, "path", r.URL.Path, "request_id", middleware.GetReqID(r.Context()))
			e = NewError(http.StatusInternalServerError, "INTERNAL", "We couldn't complete that request.",
				"Try again. If it keeps happening, contact support with request ID "+middleware.GetReqID(r.Context())+".")
		}
	}
	JSON(w, e.Status, map[string]*Error{"error": e})
}

// Decode reads a JSON body (max 1 MiB) into v.
func Decode(r *http.Request, v any) error {
	dec := json.NewDecoder(http.MaxBytesReader(nil, r.Body, 1<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		return BadRequest("INVALID_JSON", "The request body is not valid JSON for this endpoint.", err.Error())
	}
	return nil
}

// Logger logs one line per request.
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(ww, r)
		slog.InfoContext(r.Context(), "http",
			"method", r.Method, "path", r.URL.Path, "status", ww.Status(),
			"ms", time.Since(start).Milliseconds(), "request_id", middleware.GetReqID(r.Context()))
	})
}
