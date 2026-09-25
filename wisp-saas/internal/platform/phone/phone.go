// Package phone normalises Kenyan mobile numbers to the 2547XXXXXXXX /
// 2541XXXXXXXX form M-Pesa and Africa's Talking expect.
package phone

import (
	"regexp"
	"strings"
)

var (
	intl  = regexp.MustCompile(`^254[17]\d{8}$`)
	local = regexp.MustCompile(`^0[17]\d{8}$`)
	short = regexp.MustCompile(`^[17]\d{8}$`)
)

// Normalize returns the 254… form, or ok=false when input is not a Kenyan mobile number.
func Normalize(input string) (string, bool) {
	s := strings.NewReplacer(" ", "", "-", "", "(", "", ")", "").Replace(strings.TrimSpace(input))
	s = strings.TrimPrefix(s, "+")
	switch {
	case intl.MatchString(s):
		return s, true
	case local.MatchString(s):
		return "254" + s[1:], true
	case short.MatchString(s):
		return "254" + s, true
	}
	return "", false
}

// Pretty renders 254712345678 as 0712 345 678.
func Pretty(msisdn string) string {
	if !intl.MatchString(msisdn) {
		return msisdn
	}
	l := "0" + msisdn[3:]
	return l[:4] + " " + l[4:7] + " " + l[7:]
}

// Masked renders 254712345678 as 0712 ••• 678.
func Masked(msisdn string) string {
	if !intl.MatchString(msisdn) {
		return msisdn
	}
	l := "0" + msisdn[3:]
	return l[:4] + " ••• " + l[7:]
}
