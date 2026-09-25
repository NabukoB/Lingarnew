// Package secrets implements envelope encryption for tenant secrets (per-WISP
// Daraja credentials, PPPoE passwords, router credentials).
//
// Each tenant has one data key (DEK) wrapped by a key-encryption key (KEK):
// AWS KMS in production, or a local 32-byte key in development. Values are
// sealed with XChaCha20-Poly1305 and bound to tenant/table/column/row through
// the additional data, so a ciphertext copied elsewhere will not decrypt.
package secrets

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/chacha20poly1305"
)

// KEK wraps and unwraps data keys.
type KEK interface {
	GenerateDataKey(ctx context.Context) (plaintext, wrapped []byte, err error)
	Decrypt(ctx context.Context, wrapped []byte) ([]byte, error)
}

// Sealer encrypts values with a tenant's data key.
type Sealer struct {
	kek KEK
	ttl time.Duration

	mu    sync.Mutex
	cache map[uuid.UUID]cachedKey
}

type cachedKey struct {
	key     []byte
	expires time.Time
}

func NewSealer(kek KEK) *Sealer {
	return &Sealer{kek: kek, ttl: 5 * time.Minute, cache: map[uuid.UUID]cachedKey{}}
}

// NewDataKey creates a data key for a new tenant and returns its wrapped form.
func (s *Sealer) NewDataKey(ctx context.Context, tenantID uuid.UUID) ([]byte, error) {
	plain, wrapped, err := s.kek.GenerateDataKey(ctx)
	if err != nil {
		return nil, fmt.Errorf("generate data key: %w", err)
	}
	s.remember(tenantID, plain)
	return wrapped, nil
}

// Field names the column a value belongs to.
type Field struct {
	Table  string
	Column string
	RowID  uuid.UUID
}

func aad(tenantID uuid.UUID, f Field) []byte {
	return []byte(tenantID.String() + "|" + f.Table + "|" + f.Column + "|" + f.RowID.String())
}

// Seal encrypts plaintext. Output is nonce || ciphertext.
func (s *Sealer) Seal(ctx context.Context, tenantID uuid.UUID, wrappedDEK []byte, f Field, plaintext []byte) ([]byte, error) {
	key, err := s.key(ctx, tenantID, wrappedDEK)
	if err != nil {
		return nil, err
	}
	aead, err := chacha20poly1305.NewX(key)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, aead.NonceSize(), aead.NonceSize()+len(plaintext)+aead.Overhead())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	return aead.Seal(nonce, nonce, plaintext, aad(tenantID, f)), nil
}

// Open decrypts a value produced by Seal for the same tenant and field.
func (s *Sealer) Open(ctx context.Context, tenantID uuid.UUID, wrappedDEK []byte, f Field, sealed []byte) ([]byte, error) {
	key, err := s.key(ctx, tenantID, wrappedDEK)
	if err != nil {
		return nil, err
	}
	aead, err := chacha20poly1305.NewX(key)
	if err != nil {
		return nil, err
	}
	if len(sealed) < aead.NonceSize() {
		return nil, errors.New("secrets: ciphertext too short")
	}
	nonce, ct := sealed[:aead.NonceSize()], sealed[aead.NonceSize():]
	out, err := aead.Open(nil, nonce, ct, aad(tenantID, f))
	if err != nil {
		return nil, errors.New("secrets: value does not belong to this tenant/field or is corrupted")
	}
	return out, nil
}

func (s *Sealer) key(ctx context.Context, tenantID uuid.UUID, wrapped []byte) ([]byte, error) {
	s.mu.Lock()
	if c, ok := s.cache[tenantID]; ok && time.Now().Before(c.expires) {
		s.mu.Unlock()
		return c.key, nil
	}
	s.mu.Unlock()
	plain, err := s.kek.Decrypt(ctx, wrapped)
	if err != nil {
		return nil, fmt.Errorf("unwrap data key: %w", err)
	}
	s.remember(tenantID, plain)
	return plain, nil
}

func (s *Sealer) remember(tenantID uuid.UUID, key []byte) {
	s.mu.Lock()
	s.cache[tenantID] = cachedKey{key: key, expires: time.Now().Add(s.ttl)}
	s.mu.Unlock()
}

// LocalKEK wraps data keys with a 32-byte key from LOCAL_KEK. Development and
// self-hosted installs only.
type LocalKEK struct{ key []byte }

func NewLocalKEK(b64 string) (*LocalKEK, error) {
	k, err := base64.StdEncoding.DecodeString(b64)
	if err != nil || len(k) != chacha20poly1305.KeySize {
		return nil, errors.New("LOCAL_KEK must be 32 random bytes, base64-encoded (openssl rand -base64 32)")
	}
	return &LocalKEK{key: k}, nil
}

var kekAAD = []byte("wisp-dek-v1")

func (l *LocalKEK) GenerateDataKey(_ context.Context) ([]byte, []byte, error) {
	dek := make([]byte, chacha20poly1305.KeySize)
	if _, err := rand.Read(dek); err != nil {
		return nil, nil, err
	}
	aead, err := chacha20poly1305.NewX(l.key)
	if err != nil {
		return nil, nil, err
	}
	nonce := make([]byte, aead.NonceSize(), aead.NonceSize()+len(dek)+aead.Overhead())
	if _, err := rand.Read(nonce); err != nil {
		return nil, nil, err
	}
	return dek, aead.Seal(nonce, nonce, dek, kekAAD), nil
}

func (l *LocalKEK) Decrypt(_ context.Context, wrapped []byte) ([]byte, error) {
	aead, err := chacha20poly1305.NewX(l.key)
	if err != nil {
		return nil, err
	}
	if len(wrapped) < aead.NonceSize() {
		return nil, errors.New("wrapped key too short")
	}
	return aead.Open(nil, wrapped[:aead.NonceSize()], wrapped[aead.NonceSize():], kekAAD)
}
