// Package random produces tokens and codes from crypto/rand.
package random

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"math/big"
)

// Token returns n random bytes, base64url-encoded without padding.
func Token(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

// Hash is the SHA-256 of a token, as stored in the database.
func Hash(token string) []byte {
	h := sha256.Sum256([]byte(token))
	return h[:]
}

// Unambiguous letters and digits (no 0/O, 1/I).
const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

// Code returns an n-character code from the unambiguous alphabet.
func Code(n int) string {
	out := make([]byte, n)
	max := big.NewInt(int64(len(codeAlphabet)))
	for i := range out {
		v, err := rand.Int(rand.Reader, max)
		if err != nil {
			panic(err)
		}
		out[i] = codeAlphabet[v.Int64()]
	}
	return string(out)
}

// Password returns a random password of n characters (letters and digits).
func Password(n int) string {
	const alpha = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	out := make([]byte, n)
	max := big.NewInt(int64(len(alpha)))
	for i := range out {
		v, err := rand.Int(rand.Reader, max)
		if err != nil {
			panic(err)
		}
		out[i] = alpha[v.Int64()]
	}
	return string(out)
}
