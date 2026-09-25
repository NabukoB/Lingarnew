package session

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestAttrs(t *testing.T) {
	var a Attrs
	_ = json.Unmarshal([]byte(`{"User-Name":{"type":"string","value":["JZM1042"]},"Acct-Input-Octets":{"type":"integer","value":[10]},"Acct-Input-Gigawords":{"type":"integer","value":[2]},"Acct-Status-Type":{"type":"integer","value":["Interim-Update"]}}`), &a)
	if a.Str("User-Name") != "JZM1042" || a.Str("Missing") != "" || a.Int("Acct-Input-Octets") != 10 {
		t.Fatalf("attrs = %v", a)
	}
	if a.Octets("Acct-Input-Octets", "Acct-Input-Gigawords") != 2<<32+10 {
		t.Fatal("gigawords not combined")
	}
	if accountingStatus(a.Str("Acct-Status-Type")) != "Interim-Update" || accountingStatus("1") != "Start" || accountingStatus("2") != "Stop" {
		t.Fatal("status")
	}
}

func TestReplies(t *testing.T) {
	r := Reject(strings.Repeat("x", 300))
	if !r.Rejected() || len(r.Message()) != 250 {
		t.Fatal("reject")
	}
	a := Accept("pw", "2M/5M", 60)
	if a.Rejected() || a["reply:Mikrotik-Rate-Limit"] != "2M/5M" || a["control:Cleartext-Password"] != "pw" {
		t.Fatalf("accept = %v", a)
	}
}
