package phone

import "testing"

func TestNormalize(t *testing.T) {
	ok := map[string]string{
		"0712 345 678":   "254712345678",
		"+254712345678":  "254712345678",
		"254112345678":   "254112345678",
		"712345678":      "254712345678",
		"(0112)-345-678": "254112345678",
	}
	for in, want := range ok {
		if got, good := Normalize(in); !good || got != want {
			t.Errorf("Normalize(%q) = %q, %v; want %q", in, got, good, want)
		}
	}
	for _, in := range []string{"0812345678", "12345", "2547123456789", "", "abc"} {
		if _, good := Normalize(in); good {
			t.Errorf("Normalize(%q) accepted", in)
		}
	}
}

func TestPrettyAndMasked(t *testing.T) {
	if got := Pretty("254712345678"); got != "0712 345 678" {
		t.Errorf("Pretty = %q", got)
	}
	if got := Masked("254712345678"); got != "0712 ••• 678" {
		t.Errorf("Masked = %q", got)
	}
	if got := Pretty("nope"); got != "nope" {
		t.Errorf("Pretty passthrough = %q", got)
	}
}
