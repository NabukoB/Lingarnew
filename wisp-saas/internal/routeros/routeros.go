// Package routeros is a small client for the MikroTik RouterOS v7 REST API
// (/rest/...). It never uses the legacy binary API on port 8728.
//
// REST verbs, as RouterOS defines them:
//
//	GET    /rest/<menu>          list (query params filter, e.g. ?name=x)
//	GET    /rest/<menu>/<id>     one record
//	PUT    /rest/<menu>          create a record, returns it with ".id"
//	PATCH  /rest/<menu>/<id>     update fields
//	DELETE /rest/<menu>/<id>     remove
//	POST   /rest/<menu>/<cmd>    run a console command (e.g. ppp/active/remove)
package routeros

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Record is one RouterOS row. RouterOS returns every value as a string.
type Record map[string]string

// ID returns the record's ".id" (e.g. "*1A").
func (r Record) ID() string { return r[".id"] }

// Client talks to one router over the WireGuard tunnel.
type Client struct {
	BaseURL  string // https://10.200.1.5
	User     string
	Password string
	HTTP     *http.Client
}

// NewClient builds a client with a 10s timeout. Router certificates are
// self-signed and the traffic already runs inside WireGuard (which
// authenticates the peer), so certificate verification is optional.
func NewClient(baseURL, user, password string, insecureTLS bool) *Client {
	tr := &http.Transport{
		TLSClientConfig:     &tls.Config{InsecureSkipVerify: insecureTLS}, //nolint:gosec // see comment above
		DialContext:         (&net.Dialer{Timeout: 5 * time.Second}).DialContext,
		TLSHandshakeTimeout: 5 * time.Second,
		MaxIdleConnsPerHost: 2,
		IdleConnTimeout:     90 * time.Second,
	}
	return &Client{BaseURL: strings.TrimRight(baseURL, "/"), User: user, Password: password,
		HTTP: &http.Client{Timeout: 10 * time.Second, Transport: tr}}
}

// Error is a RouterOS REST error, or a transport failure (Status 0).
type Error struct {
	Status  int
	Message string
	Detail  string
	Op      string
}

func (e *Error) Error() string {
	if e.Status == 0 {
		return fmt.Sprintf("router %s: %s", e.Op, e.Message)
	}
	return fmt.Sprintf("router %s: %d %s: %s", e.Op, e.Status, e.Message, e.Detail)
}

// Unreachable reports whether the router could not be reached at all.
func Unreachable(err error) bool {
	var e *Error
	return errors.As(err, &e) && e.Status == 0
}

// IsNotFound reports a 404 from the router.
func IsNotFound(err error) bool {
	var e *Error
	return errors.As(err, &e) && e.Status == http.StatusNotFound
}

// Unauthorized reports rejected credentials.
func Unauthorized(err error) bool {
	var e *Error
	return errors.As(err, &e) && e.Status == http.StatusUnauthorized
}

func (c *Client) do(ctx context.Context, method, path string, body, out any) error {
	op := method + " /rest/" + path
	var rd io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		rd = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.BaseURL+"/rest/"+path, rd)
	if err != nil {
		return err
	}
	req.SetBasicAuth(c.User, c.Password)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return &Error{Op: op, Message: err.Error()}
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if resp.StatusCode >= 300 {
		var e struct {
			Error   int    `json:"error"`
			Message string `json:"message"`
			Detail  string `json:"detail"`
		}
		_ = json.Unmarshal(data, &e)
		if e.Message == "" {
			e.Message = http.StatusText(resp.StatusCode)
		}
		return &Error{Op: op, Status: resp.StatusCode, Message: e.Message, Detail: e.Detail}
	}
	if out == nil || len(data) == 0 {
		return nil
	}
	if err := json.Unmarshal(data, out); err != nil {
		return &Error{Op: op, Status: resp.StatusCode, Message: "unexpected response", Detail: err.Error()}
	}
	return nil
}

// List returns every record in a menu, optionally filtered by exact field values.
func (c *Client) List(ctx context.Context, menu string, filter map[string]string) ([]Record, error) {
	path := menu
	if len(filter) > 0 {
		q := url.Values{}
		for k, v := range filter {
			q.Set(k, v)
		}
		path += "?" + q.Encode()
	}
	var out []Record
	return out, c.do(ctx, http.MethodGet, path, nil, &out)
}

// Get returns a single object menu (e.g. system/resource) or one record by id.
func (c *Client) Get(ctx context.Context, path string) (Record, error) {
	var out Record
	return out, c.do(ctx, http.MethodGet, path, nil, &out)
}

// Add creates a record (PUT) and returns it.
func (c *Client) Add(ctx context.Context, menu string, fields Record) (Record, error) {
	var out Record
	return out, c.do(ctx, http.MethodPut, menu, fields, &out)
}

// Set updates fields on a record (PATCH).
func (c *Client) Set(ctx context.Context, menu, id string, fields Record) error {
	return c.do(ctx, http.MethodPatch, menu+"/"+url.PathEscape(id), fields, nil)
}

// Remove deletes a record.
func (c *Client) Remove(ctx context.Context, menu, id string) error {
	return c.do(ctx, http.MethodDelete, menu+"/"+url.PathEscape(id), nil, nil)
}

// Command runs a console command via POST (e.g. "ppp/active/remove").
func (c *Client) Command(ctx context.Context, path string, args Record) error {
	return c.do(ctx, http.MethodPost, path, args, nil)
}

// Resource is GET /rest/system/resource.
type Resource struct {
	BoardName    string `json:"board-name"`
	Version      string `json:"version"`
	Uptime       string `json:"uptime"`
	CPULoad      int    `json:"-"`
	FreeMemory   int64  `json:"-"`
	TotalMemory  int64  `json:"-"`
	FreeHDD      int64  `json:"-"`
	Architecture string `json:"architecture-name"`
}

func atoi64(s string) int64 {
	n, _ := strconv.ParseInt(strings.TrimSuffix(strings.TrimSpace(s), "%"), 10, 64)
	return n
}

// Resource reads CPU, memory, version and board.
func (c *Client) Resource(ctx context.Context) (Resource, error) {
	r, err := c.Get(ctx, "system/resource")
	if err != nil {
		return Resource{}, err
	}
	return Resource{
		BoardName:    r["board-name"],
		Version:      r["version"],
		Uptime:       r["uptime"],
		Architecture: r["architecture-name"],
		CPULoad:      int(atoi64(r["cpu-load"])),
		FreeMemory:   atoi64(r["free-memory"]),
		TotalMemory:  atoi64(r["total-memory"]),
		FreeHDD:      atoi64(r["free-hdd-space"]),
	}, nil
}

// Serial returns the RouterBOARD serial number, or "" on CHR/x86 (no routerboard).
func (c *Client) Serial(ctx context.Context) string {
	r, err := c.Get(ctx, "system/routerboard")
	if err != nil {
		return ""
	}
	return r["serial-number"]
}

// Identity is GET /rest/system/identity.
func (c *Client) Identity(ctx context.Context) (string, error) {
	r, err := c.Get(ctx, "system/identity")
	return r["name"], err
}

// Find returns the first record matching filter, or nil.
func (c *Client) Find(ctx context.Context, menu string, filter map[string]string) (Record, error) {
	rows, err := c.List(ctx, menu, filter)
	if err != nil || len(rows) == 0 {
		return nil, err
	}
	return rows[0], nil
}

// Ensure makes sure a record matching key exists with the given fields.
// It creates it if missing and patches fields that differ. Returns true if
// anything changed.
func (c *Client) Ensure(ctx context.Context, menu string, key map[string]string, fields Record) (bool, error) {
	rec, err := c.Find(ctx, menu, key)
	if err != nil {
		return false, err
	}
	if rec == nil {
		all := Record{}
		for k, v := range key {
			all[k] = v
		}
		for k, v := range fields {
			all[k] = v
		}
		_, err := c.Add(ctx, menu, all)
		return err == nil, err
	}
	diff := Record{}
	for k, v := range fields {
		if rec[k] != v {
			diff[k] = v
		}
	}
	if len(diff) == 0 {
		return false, nil
	}
	return true, c.Set(ctx, menu, rec.ID(), diff)
}

// RateLimit formats a MikroTik rate-limit / max-limit value. RouterOS order is
// rx/tx from the router's view = client upload / client download.
func RateLimit(upKbps, downKbps int32) string {
	return Speed(upKbps) + "/" + Speed(downKbps)
}

// Speed formats kbps as RouterOS does ("512k", "5M").
func Speed(kbps int32) string {
	if kbps%1000 == 0 {
		return strconv.Itoa(int(kbps/1000)) + "M"
	}
	return strconv.Itoa(int(kbps)) + "k"
}
