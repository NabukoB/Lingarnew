package random

import (
	"encoding/base64"
	"regexp"
	"testing"
)

func TestRandom(t *testing.T) {
	tok := Token(32)
	if b, err := base64.RawURLEncoding.DecodeString(tok); err != nil || len(b) != 32 {
		t.Fatalf("token %q: %v", tok, err)
	}
	if Token(32) == tok {
		t.Fatal("tokens repeat")
	}
	if len(Hash("a")) != 32 || string(Hash("a")) == string(Hash("b")) {
		t.Fatal("hash")
	}
	if c := Code(8); !regexp.MustCompile(`^[A-HJ-NP-Z2-9]{8}$`).MatchString(c) {
		t.Fatalf("code %q uses ambiguous characters", c)
	}
	if p := Password(24); len(p) != 24 || !regexp.MustCompile(`^[a-zA-Z2-9]+$`).MatchString(p) {
		t.Fatalf("password %q", p)
	}
}
