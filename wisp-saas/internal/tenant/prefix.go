package tenant

import (
	"regexp"
	"strings"
	"unicode"
)

var prefixRe = regexp.MustCompile(`^[A-Z]{2,4}$`)

func isVowel(r rune) bool { return strings.ContainsRune("AEIOU", r) }

// PrefixCandidates suggests account prefixes for a business name, best first.
// "Jazmoge WiFi" → JZM, JW, JZG, JAZ …
func PrefixCandidates(name string) []string {
	var words []string
	for _, w := range strings.FieldsFunc(strings.ToUpper(name), func(r rune) bool { return !unicode.IsLetter(r) }) {
		var b strings.Builder
		for _, r := range w {
			if r >= 'A' && r <= 'Z' {
				b.WriteRune(r)
			}
		}
		if b.Len() > 0 {
			words = append(words, b.String())
		}
	}
	if len(words) == 0 {
		return []string{"WSP"}
	}
	first := []rune(words[0])
	var cons []rune
	for i, r := range first {
		if i == 0 || !isVowel(r) {
			cons = append(cons, r)
		}
	}
	seen := map[string]bool{}
	var out []string
	add := func(s string) {
		if prefixRe.MatchString(s) && !seen[s] {
			seen[s] = true
			out = append(out, s)
		}
	}
	if len(cons) >= 3 {
		add(string(cons[:3]))
	}
	var initials []rune
	for _, w := range words {
		initials = append(initials, []rune(w)[0])
	}
	if len(initials) > 4 {
		initials = initials[:4]
	}
	add(string(initials))
	for i := 1; i < len(cons); i++ {
		for j := i + 1; j < len(cons); j++ {
			add(string([]rune{cons[0], cons[i], cons[j]}))
		}
	}
	if len(first) >= 3 {
		add(string(first[:3]))
	}
	if len(cons) >= 2 {
		add(string(cons[:2]))
	}
	if len(cons) >= 4 {
		add(string(cons[:4]))
	}
	for c := 'A'; c <= 'Z'; c++ {
		add(string([]rune{first[0], c}))
	}
	return out
}

// Slugify turns "Jazmoge WiFi" into "jazmoge-wifi".
func Slugify(name string) string {
	var b strings.Builder
	dash := false
	for _, r := range strings.ToLower(name) {
		switch {
		case r >= 'a' && r <= 'z' || r >= '0' && r <= '9':
			b.WriteRune(r)
			dash = false
		case !dash && b.Len() > 0:
			b.WriteByte('-')
			dash = true
		}
	}
	s := strings.TrimSuffix(b.String(), "-")
	if len(s) > 40 {
		s = strings.TrimSuffix(s[:40], "-")
	}
	if s == "" {
		s = "wisp"
	}
	return s
}
