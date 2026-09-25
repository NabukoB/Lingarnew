package router

import (
	"bytes"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"fmt"
	"io"
	"regexp"
	"strings"
	"text/template"
	"time"

	"golang.org/x/crypto/hkdf"
)

//go:embed templates/*
var templates embed.FS

var (
	scriptTmpl = template.Must(template.New("setup.rsc").Funcs(template.FuncMap{"q": rosQuote, "list": rosList}).
			ParseFS(templates, "templates/setup.rsc"))
	hotspotTmpl = template.Must(template.New("").Funcs(template.FuncMap{"js": template.JSEscapeString}).
			ParseFS(templates, "templates/hotspot/*.html"))
)

// HotspotFiles are the captive-portal pages the setup script downloads.
var HotspotFiles = []string{"login.html", "rlogin.html", "alogin.html", "status.html", "logout.html", "error.html"}

// ScriptData is everything the one-time RouterOS setup script needs.
type ScriptData struct {
	RouterID     string
	RouterName   string
	TenantName   string
	Generated    time.Time
	Expires      time.Time
	TunnelIP     string // router side, e.g. 10.200.1.5
	ServerIP     string // cloud side, 10.200.0.1
	ServerKey    string // WireGuard public key (base64)
	EndpointHost string
	EndpointPort string
	APIUser      string
	APIPassword  string
	RadiusSecret string
	HotspotPorts []string
	PPPoEPorts   []string
	WalledGarden []string // hosts reachable before paying
	CheckHost    string   // host the script resolves to confirm DNS works
	FilesURL     string   // base URL for hotspot pages
	CallbackURL  string   // POST {public_key}
}

// AllPorts is every customer-facing port, for the pre-flight check.
func (d ScriptData) AllPorts() []string {
	return append(append([]string{}, d.HotspotPorts...), d.PPPoEPorts...)
}

// HotspotFileNames lists the portal pages to download.
func (d ScriptData) HotspotFileNames() []string { return HotspotFiles }

// PortalData fills the hotspot HTML pages.
type PortalData struct {
	TenantName string
	PortalURL  string // e.g. https://portal.example.com/?t=jazmoge
	RouterID   string
}

// RenderScript renders the setup script.
func RenderScript(d ScriptData) (string, error) {
	var b bytes.Buffer
	if err := scriptTmpl.Execute(&b, d); err != nil {
		return "", err
	}
	return b.String(), nil
}

// RenderHotspotFile renders one captive-portal page.
func RenderHotspotFile(w io.Writer, name string, d PortalData) error {
	for _, f := range HotspotFiles {
		if f == name {
			return hotspotTmpl.ExecuteTemplate(w, name, d)
		}
	}
	return fmt.Errorf("unknown hotspot file %q", name)
}

// ErrorScript is served instead of the setup script when the command can't
// be used; the router prints the message.
func ErrorScript(msg string) string {
	return ":error " + rosQuote("WISP setup stopped: "+msg) + "\n"
}

// rosQuote returns a RouterOS double-quoted string literal.
func rosQuote(s string) string {
	r := strings.NewReplacer(`\`, `\\`, `"`, `\"`, `$`, `\$`, "\n", " ", "\r", " ", "?", `\?`)
	return `"` + r.Replace(s) + `"`
}

// rosList renders a RouterOS array literal: {"ether2";"ether3"}.
func rosList(items []string) string {
	q := make([]string, len(items))
	for i, s := range items {
		q[i] = rosQuote(s)
	}
	return "{" + strings.Join(q, ";") + "}"
}

var portRe = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$`)

// ValidPort reports whether s looks like a RouterOS interface name.
func ValidPort(s string) bool { return portRe.MatchString(s) }

// RadiusSecret derives a router's RADIUS shared secret from the platform seed
// (HKDF-SHA256). It is never stored; FreeRADIUS asks cmd/radius for it.
func RadiusSecret(seed string, routerID fmt.Stringer) string {
	r := hkdf.New(sha256.New, []byte(seed), []byte("wisp-radius-v1"), []byte(routerID.String()))
	b := make([]byte, 16)
	if _, err := io.ReadFull(r, b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}
