package session

import (
	"encoding/json"
	"strconv"
	"strings"
)

// Attrs is the request body FreeRADIUS rlm_rest sends with body = "json":
//
//	{"User-Name": {"type": "string", "value": ["JZM1042"]}, ...}
type Attrs map[string]struct {
	Type  string            `json:"type"`
	Value []json.RawMessage `json:"value"`
}

// Str returns an attribute's first value as a string ("" if absent).
func (a Attrs) Str(name string) string {
	v, ok := a[name]
	if !ok || len(v.Value) == 0 {
		return ""
	}
	var s string
	if err := json.Unmarshal(v.Value[0], &s); err == nil {
		return s
	}
	return strings.TrimSpace(string(v.Value[0]))
}

// Int returns an attribute's first value as an integer (0 if absent).
func (a Attrs) Int(name string) int64 {
	n, _ := strconv.ParseInt(a.Str(name), 10, 64)
	return n
}

// Octets combines a 32-bit counter with its Gigawords overflow attribute.
func (a Attrs) Octets(counter, gigawords string) int64 {
	return a.Int(gigawords)<<32 + a.Int(counter)
}

// Reply is what the Go side returns to rlm_rest: "list:Attribute" => value.
type Reply map[string]any

// Reject builds a reply that makes FreeRADIUS send Access-Reject with a
// message the router shows (Hotspot login page) or logs (PPPoE).
func Reject(msg string) Reply {
	if len(msg) > 250 {
		msg = msg[:250]
	}
	return Reply{"control:Auth-Type": "Reject", "reply:Reply-Message": msg}
}

// Rejected reports whether r is a rejection.
func (r Reply) Rejected() bool { return r["control:Auth-Type"] == "Reject" }

// Message is the Reply-Message, if any.
func (r Reply) Message() string { s, _ := r["reply:Reply-Message"].(string); return s }

// Accept builds an accept reply.
func Accept(password, rateLimit string, timeout int64) Reply {
	return Reply{
		"control:Cleartext-Password":  password,
		"reply:Mikrotik-Rate-Limit":   rateLimit,
		"reply:Session-Timeout":       timeout,
		"reply:Acct-Interim-Interval": 300,
	}
}

// accountingStatus normalises Acct-Status-Type (rlm_rest sends the enum name,
// but accept numbers too).
func accountingStatus(s string) string {
	switch s {
	case "1":
		return "Start"
	case "2":
		return "Stop"
	case "3":
		return "Interim-Update"
	case "7":
		return "Accounting-On"
	case "8":
		return "Accounting-Off"
	}
	return s
}
