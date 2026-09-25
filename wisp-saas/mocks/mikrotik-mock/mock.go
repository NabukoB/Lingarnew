// Package mikrotikmock is an in-memory HTTP server that mimics the RouterOS v7
// REST API closely enough to test every call this project makes: list with
// filters, get by id, PUT create, PATCH, DELETE, POST commands, singleton
// menus (system/resource, system/identity) and Basic Auth.
package mikrotikmock

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"sync"
)

type Record = map[string]string

// Router is one fake router.
type Router struct {
	User, Password string

	mu         sync.Mutex
	tables     map[string][]Record
	singletons map[string]Record
	nextID     int
	// Down makes every request fail with 503, as if the tunnel dropped.
	Down bool
	// Calls records "METHOD path" for assertions.
	Calls []string
}

// New returns a router with a default RouterOS 7 identity and resources.
func New(user, password string) *Router {
	return &Router{
		User: user, Password: password,
		tables: map[string][]Record{},
		singletons: map[string]Record{
			"system/resource": {
				"board-name": "hAP ax3", "version": "7.15.2 (stable)", "uptime": "1d2h3m",
				"cpu-load": "12", "free-memory": "128000000", "total-memory": "1073741824",
				"free-hdd-space": "90000000", "architecture-name": "arm64",
			},
			"system/identity":    {"name": "MikroTik"},
			"system/routerboard": {"serial-number": "HE10A1B2C3D", "model": "C53UiG+5HPaxD2HPaxD"},
			"radius/incoming":    {"accept": "false", "port": "3799"},
		},
	}
}

// Seed replaces a table's rows (ids are assigned).
func (r *Router) Seed(menu string, rows ...Record) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.tables[menu] = nil
	for _, row := range rows {
		r.insert(menu, row)
	}
}

// Rows returns a copy of a table.
func (r *Router) Rows(menu string) []Record {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]Record, 0, len(r.tables[menu]))
	for _, row := range r.tables[menu] {
		out = append(out, copyRec(row))
	}
	return out
}

// SetSingleton overrides a singleton menu such as system/resource.
// Singleton returns a copy of a singleton menu.
func (r *Router) Singleton(menu string) Record {
	r.mu.Lock()
	defer r.mu.Unlock()
	return copyRec(r.singletons[menu])
}

// SetSingleton overrides a singleton menu such as system/resource.
func (r *Router) SetSingleton(menu string, rec Record) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.singletons[menu] = rec
}

func (r *Router) insert(menu string, row Record) Record {
	r.nextID++
	rec := copyRec(row)
	rec[".id"] = fmt.Sprintf("*%X", r.nextID)
	r.tables[menu] = append(r.tables[menu], rec)
	return rec
}

func copyRec(in Record) Record {
	out := make(Record, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}

func writeErr(w http.ResponseWriter, code int, detail string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]any{"error": code, "message": http.StatusText(code), "detail": detail})
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

// commands maps "menu/cmd" POST endpoints to the table they act on.
var removeCommands = map[string]string{
	"ppp/active/remove":        "ppp/active",
	"ip/hotspot/active/remove": "ip/hotspot/active",
}

func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.Calls = append(r.Calls, req.Method+" "+req.URL.Path)
	if r.Down {
		writeErr(w, http.StatusServiceUnavailable, "router down")
		return
	}
	if u, p, ok := req.BasicAuth(); !ok || u != r.User || p != r.Password {
		writeErr(w, http.StatusUnauthorized, "invalid user name or password")
		return
	}
	path := strings.Trim(strings.TrimPrefix(req.URL.Path, "/rest"), "/")
	if path == "" {
		writeErr(w, http.StatusBadRequest, "no such command")
		return
	}

	if req.Method == http.MethodPost && strings.HasSuffix(path, "/set") {
		if _, ok := r.singletons[strings.TrimSuffix(path, "/set")]; ok {
			path = strings.TrimSuffix(path, "/set")
		}
	}
	if s, ok := r.singletons[path]; ok {
		switch req.Method {
		case http.MethodGet:
			writeJSON(w, s)
		case http.MethodPatch, http.MethodPost:
			var in Record
			if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
				writeErr(w, http.StatusBadRequest, err.Error())
				return
			}
			for k, v := range in {
				s[k] = v
			}
			writeJSON(w, s)
		default:
			writeErr(w, http.StatusBadRequest, "no such command")
		}
		return
	}

	switch req.Method {
	case http.MethodGet:
		if menu, id, ok := r.splitID(path); ok {
			if rec := r.find(menu, id); rec != nil {
				writeJSON(w, rec)
				return
			}
			writeErr(w, http.StatusNotFound, "no such item")
			return
		}
		out := []Record{}
		q := req.URL.Query()
		for _, row := range r.tables[path] {
			match := true
			for k := range q {
				if k == ".proplist" {
					continue
				}
				if row[k] != q.Get(k) {
					match = false
					break
				}
			}
			if match {
				out = append(out, copyRec(row))
			}
		}
		writeJSON(w, out)
	case http.MethodPut:
		var in Record
		if err := decode(req.Body, &in); err != nil {
			writeErr(w, http.StatusBadRequest, err.Error())
			return
		}
		if name := in["name"]; name != "" {
			for _, row := range r.tables[path] {
				if row["name"] == name {
					writeErr(w, http.StatusBadRequest, "failure: entry already exists")
					return
				}
			}
		}
		writeJSON(w, r.insert(path, in))
	case http.MethodPatch:
		menu, id, ok := r.splitID(path)
		rec := r.find(menu, id)
		if !ok || rec == nil {
			writeErr(w, http.StatusNotFound, "no such item")
			return
		}
		var in Record
		if err := decode(req.Body, &in); err != nil {
			writeErr(w, http.StatusBadRequest, err.Error())
			return
		}
		for k, v := range in {
			rec[k] = v
		}
		writeJSON(w, rec)
	case http.MethodDelete:
		menu, id, ok := r.splitID(path)
		if !ok || !r.delete(menu, id) {
			writeErr(w, http.StatusNotFound, "no such item")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	case http.MethodPost:
		table, ok := removeCommands[path]
		if !ok {
			writeErr(w, http.StatusBadRequest, "no such command")
			return
		}
		var in Record
		if err := decode(req.Body, &in); err != nil {
			writeErr(w, http.StatusBadRequest, err.Error())
			return
		}
		ids := strings.Split(in[".id"], ",")
		sort.Strings(ids)
		for _, id := range ids {
			if !r.delete(table, id) {
				writeErr(w, http.StatusBadRequest, "no such item ("+id+")")
				return
			}
		}
		writeJSON(w, []Record{})
	default:
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func decode(body io.Reader, out *Record) error {
	if err := json.NewDecoder(body).Decode(out); err != nil {
		return fmt.Errorf("json: %w", err)
	}
	return nil
}

// splitID splits "ip/pool/*3" into ("ip/pool", "*3").
func (r *Router) splitID(path string) (string, string, bool) {
	i := strings.LastIndex(path, "/")
	if i < 0 || !strings.HasPrefix(path[i+1:], "*") {
		return "", "", false
	}
	return path[:i], path[i+1:], true
}

func (r *Router) find(menu, id string) Record {
	for _, row := range r.tables[menu] {
		if row[".id"] == id {
			return row
		}
	}
	return nil
}

func (r *Router) delete(menu, id string) bool {
	rows := r.tables[menu]
	for i, row := range rows {
		if row[".id"] == id {
			r.tables[menu] = append(rows[:i], rows[i+1:]...)
			return true
		}
	}
	return false
}
