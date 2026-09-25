package tenant

import "testing"

func TestPrefixCandidates(t *testing.T) {
	got := PrefixCandidates("Jazmoge WiFi")
	if len(got) < 5 || got[0] != "JZM" || got[1] != "JW" {
		t.Fatalf("PrefixCandidates = %v", got)
	}
	for _, p := range got {
		if !prefixRe.MatchString(p) {
			t.Fatalf("invalid candidate %q", p)
		}
	}
	if c := PrefixCandidates("!!!"); c[0] != "WSP" {
		t.Fatalf("fallback = %v", c)
	}
	if c := PrefixCandidates("A"); len(c) == 0 {
		t.Fatal("single letter name gave no candidates")
	}
}

func TestSlugify(t *testing.T) {
	cases := map[string]string{"Jazmoge WiFi": "jazmoge-wifi", "  Net & Co. ": "net-co", "***": "wisp"}
	for in, want := range cases {
		if got := Slugify(in); got != want {
			t.Errorf("Slugify(%q) = %q, want %q", in, got, want)
		}
	}
}
