// Package auth handles WISP sign-in sessions. Sessions are opaque random
// tokens sent as "Authorization: Bearer <token>"; only their SHA-256 is stored.
package auth

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/db"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/random"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
)

type ctxKey struct{}

// TenantID returns the signed-in tenant, or uuid.Nil.
func TenantID(ctx context.Context) uuid.UUID {
	id, _ := ctx.Value(ctxKey{}).(uuid.UUID)
	return id
}

// WithTenant returns ctx carrying tenantID (used by tests and internal callers).
func WithTenant(ctx context.Context, tenantID uuid.UUID) context.Context {
	return context.WithValue(ctx, ctxKey{}, tenantID)
}

type Service struct {
	DB  *db.DB
	TTL time.Duration
}

// IssueSession creates a session for tenantID and returns the raw token.
func (s *Service) IssueSession(ctx context.Context, tenantID uuid.UUID) (string, time.Time, error) {
	token := random.Token(32)
	expires := time.Now().Add(s.TTL)
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		return q.CreateAuthSession(ctx, store.CreateAuthSessionParams{TokenHash: random.Hash(token), ExpiresAt: expires})
	})
	return token, expires, err
}

// Login checks credentials and issues a session.
func (s *Service) Login(ctx context.Context, email, password string) (string, time.Time, error) {
	var row store.TenantLoginRow
	err := s.DB.WithoutTenant(ctx, func(q *store.Queries) error {
		var err error
		row, err = q.TenantLogin(ctx, strings.TrimSpace(email))
		return err
	})
	bad := httpx.NewError(http.StatusUnauthorized, "BAD_CREDENTIALS", "That email and password don't match.", "Check both and try again.")
	if db.IsNotFound(err) {
		_, _ = HashPassword(password) // keep timing similar for unknown emails
		return "", time.Time{}, bad
	}
	if err != nil {
		return "", time.Time{}, err
	}
	ok, err := CheckPassword(row.PasswordHash, password)
	if err != nil || !ok {
		return "", time.Time{}, bad
	}
	return s.IssueSession(ctx, row.TenantID)
}

// Logout deletes the session behind token.
func (s *Service) Logout(ctx context.Context, tenantID uuid.UUID, token string) error {
	return s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		return q.DeleteAuthSession(ctx, random.Hash(token))
	})
}

// BearerToken extracts the token from the Authorization header.
func BearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if strings.HasPrefix(h, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(h, "Bearer "))
	}
	return ""
}

// Require rejects requests without a valid session and stores the tenant in the context.
func (s *Service) Require(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := BearerToken(r)
		if token == "" {
			httpx.Fail(w, r, httpx.ErrUnauthorized)
			return
		}
		var tenant uuid.UUID
		err := s.DB.WithoutTenant(r.Context(), func(q *store.Queries) error {
			var err error
			tenant, err = q.AuthSessionTenant(r.Context(), random.Hash(token))
			return err
		})
		if err != nil || tenant == uuid.Nil {
			httpx.Fail(w, r, httpx.ErrUnauthorized)
			return
		}
		next.ServeHTTP(w, r.WithContext(WithTenant(r.Context(), tenant)))
	})
}
