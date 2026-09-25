package secrets

import (
	"bytes"
	"context"
	"encoding/base64"
	"testing"

	"github.com/google/uuid"
)

func newSealer(t *testing.T) *Sealer {
	t.Helper()
	kek, err := NewLocalKEK(base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{9}, 32)))
	if err != nil {
		t.Fatal(err)
	}
	return NewSealer(kek)
}

func TestSealOpenRoundTrip(t *testing.T) {
	ctx := context.Background()
	s := newSealer(t)
	tenant := uuid.New()
	wrapped, err := s.NewDataKey(ctx, tenant)
	if err != nil {
		t.Fatal(err)
	}
	f := Field{Table: "subscribers", Column: "pppoe_password_enc", RowID: uuid.New()}
	sealed, err := s.Seal(ctx, tenant, wrapped, f, []byte("s3cret"))
	if err != nil {
		t.Fatal(err)
	}
	got, err := s.Open(ctx, tenant, wrapped, f, sealed)
	if err != nil || string(got) != "s3cret" {
		t.Fatalf("Open = %q, %v", got, err)
	}

	// A fresh sealer (cold cache) must unwrap the DEK through the KEK.
	s2 := newSealer(t)
	got, err = s2.Open(ctx, tenant, wrapped, f, sealed)
	if err != nil || string(got) != "s3cret" {
		t.Fatalf("cold Open = %q, %v", got, err)
	}
}

func TestSealIsBoundToTenantAndField(t *testing.T) {
	ctx := context.Background()
	s := newSealer(t)
	a, b := uuid.New(), uuid.New()
	wa, _ := s.NewDataKey(ctx, a)
	f := Field{Table: "subscribers", Column: "pppoe_password_enc", RowID: uuid.New()}
	sealed, _ := s.Seal(ctx, a, wa, f, []byte("x"))

	other := f
	other.RowID = uuid.New()
	if _, err := s.Open(ctx, a, wa, other, sealed); err == nil {
		t.Fatal("ciphertext opened for a different row")
	}
	other = f
	other.Column = "api_password_enc"
	if _, err := s.Open(ctx, a, wa, other, sealed); err == nil {
		t.Fatal("ciphertext opened for a different column")
	}
	// Tenant B with tenant A's wrapped key must still fail: the AAD carries the tenant.
	if _, err := s.Open(ctx, b, wa, f, sealed); err == nil {
		t.Fatal("ciphertext opened for a different tenant")
	}
}

func TestLocalKEKRejectsBadKey(t *testing.T) {
	if _, err := NewLocalKEK("short"); err == nil {
		t.Fatal("expected error for a short key")
	}
}
