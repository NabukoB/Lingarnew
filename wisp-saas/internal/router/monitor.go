package router

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/db"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/routeros"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
)

const (
	// HighCPU is the load (%) that counts as overloaded.
	HighCPU = 90
	// HighCPUSamples is how many consecutive minute samples at HighCPU raise an alert.
	HighCPUSamples = 15
	// NeighborEvery is how often /ip/neighbor is re-read.
	NeighborEvery = 10 * time.Minute
	// minuteRetention is how long minute samples stay before being folded into hours.
	minuteRetention = 48 * time.Hour
	// hourRetention is how long hourly samples are kept.
	hourRetention = 31 * 24 * time.Hour
)

// pollSample is what one poll reads from a healthy router beyond system/resource.
type pollSample struct {
	pppoe, hotspot int
	uplink         routeros.Uplink
	hasUplink      bool
	neighbors      []routeros.Neighbor
	readNeighbors  bool
}

// collect reads session counts, uplink counters and (when due) neighbours.
// Failures here never mark the router unhealthy; they only leave gaps.
func (s *Service) collect(ctx context.Context, c *routeros.Client, rt store.Router, neighborsDue bool) pollSample {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()
	var out pollSample
	var err error
	if out.pppoe, err = c.Count(ctx, "ppp/active"); err != nil {
		slog.DebugContext(ctx, "count ppp/active", "router_id", rt.ID, "err", err)
	}
	if out.hotspot, err = c.Count(ctx, "ip/hotspot/active"); err != nil && !routeros.IsNotFound(err) {
		slog.DebugContext(ctx, "count hotspot", "router_id", rt.ID, "err", err)
	}
	if out.uplink, out.hasUplink, err = c.Uplink(ctx); err != nil {
		slog.DebugContext(ctx, "read uplink", "router_id", rt.ID, "err", err)
	}
	if neighborsDue {
		if out.neighbors, err = c.Neighbors(ctx); err == nil {
			out.readNeighbors = true
		} else {
			slog.DebugContext(ctx, "read neighbors", "router_id", rt.ID, "err", err)
		}
	}
	return out
}

// BitsPerSecond turns two byte-counter readings into a rate. It returns nil
// when the counters reset, the interface changed or the gap is too long.
func BitsPerSecond(prevBytes, curBytes int64, gap time.Duration) *int64 {
	if gap <= 0 || gap > 10*time.Minute || curBytes < prevBytes {
		return nil
	}
	bps := (curBytes - prevBytes) * 8 * int64(time.Second) / int64(gap)
	return &bps
}

// MemUsedPercent is the share of RAM in use.
func MemUsedPercent(free, total int64) int16 {
	if total <= 0 || free < 0 || free > total {
		return 0
	}
	return int16((total - free) * 100 / total)
}

// HighCPUStarted reports whether the newest samples (newest first) just
// reached HighCPUSamples in a row at HighCPU, so the alert fires once per episode.
func HighCPUStarted(loads []int16) bool {
	if len(loads) < HighCPUSamples {
		return false
	}
	for _, l := range loads[:HighCPUSamples] {
		if l < HighCPU {
			return false
		}
	}
	return len(loads) == HighCPUSamples || loads[HighCPUSamples] < HighCPU
}

func clampPct(n int) int16 {
	if n < 0 {
		return 0
	}
	if n > 100 {
		return 100
	}
	return int16(n)
}

// record stores one minute sample (and the neighbour snapshot) inside the
// poll's transaction. It returns true when a high-CPU episode just started.
func record(ctx context.Context, q *store.Queries, rt store.Router, res routeros.Resource, smp pollSample, now time.Time) (bool, error) {
	p := store.InsertRouterMetricParams{
		RouterID: rt.ID, At: now, CpuLoad: clampPct(res.CPULoad), MemUsedPct: MemUsedPercent(res.FreeMemory, res.TotalMemory),
		PppoeUsers: int32(smp.pppoe), HotspotUsers: int32(smp.hotspot),
	}
	if up := routeros.UptimeSeconds(res.Uptime); up > 0 {
		p.UptimeSec = &up
	}
	if smp.hasUplink {
		p.Uplink, p.RxBytes, p.TxBytes = &smp.uplink.Interface, &smp.uplink.RxBytes, &smp.uplink.TxBytes
		prev, err := q.LastRouterMetric(ctx, rt.ID)
		if err != nil && !db.IsNotFound(err) {
			return false, err
		}
		if err == nil && prev.Uplink != nil && *prev.Uplink == smp.uplink.Interface && prev.RxBytes != nil && prev.TxBytes != nil {
			gap := now.Sub(prev.At)
			p.RxBps = BitsPerSecond(*prev.RxBytes, smp.uplink.RxBytes, gap)
			p.TxBps = BitsPerSecond(*prev.TxBytes, smp.uplink.TxBytes, gap)
		}
	}
	if err := q.InsertRouterMetric(ctx, p); err != nil {
		return false, err
	}
	if smp.readNeighbors {
		if err := q.DeleteRouterNeighbors(ctx, rt.ID); err != nil {
			return false, err
		}
		for _, n := range smp.neighbors {
			if err := q.InsertRouterNeighbor(ctx, store.InsertRouterNeighborParams{
				RouterID: rt.ID, Interface: n.Interface, MacAddress: n.MAC, Identity: nilIfEmpty(n.Identity),
				Address: nilIfEmpty(n.Address), Platform: nilIfEmpty(n.Platform), Board: nilIfEmpty(n.Board),
				Version: nilIfEmpty(n.Version), SeenAt: now,
			}); err != nil {
				return false, err
			}
		}
	}
	loads, err := q.RecentCPULoads(ctx, store.RecentCPULoadsParams{RouterID: rt.ID, Limit: HighCPUSamples + 1})
	if err != nil {
		return false, err
	}
	return HighCPUStarted(loads), nil
}

// neighborsDue reports whether the router's neighbour list should be re-read.
func (s *Service) neighborsDue(ctx context.Context, tenantID, routerID uuid.UUID) bool {
	due := true
	_ = s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		at, err := q.NeighborsSeenAt(ctx, routerID)
		if err == nil {
			due = s.now().Sub(at) >= NeighborEvery
		}
		return nil
	})
	return due
}

// FoldMetrics averages minute samples older than two days into hourly rows
// and drops anything older than 31 days. The worker runs it hourly.
func (s *Service) FoldMetrics(ctx context.Context, tenantID uuid.UUID) error {
	now := s.now()
	before := now.Add(-minuteRetention).Truncate(time.Hour)
	return s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		if _, err := q.FoldRouterMetrics(ctx, before); err != nil {
			return err
		}
		if err := q.DeleteFoldedRouterMetrics(ctx, before); err != nil {
			return err
		}
		return q.DeleteOldRouterMetrics(ctx, now.Add(-hourRetention))
	})
}

// Point is one chart bucket.
type Point struct {
	At           time.Time `json:"at"`
	CPULoad      int32     `json:"cpu_load"`
	MemUsedPct   int32     `json:"mem_used_pct"`
	PPPoEUsers   int32     `json:"pppoe_users"`
	HotspotUsers int32     `json:"hotspot_users"`
	RxBps        int64     `json:"rx_bps"`
	TxBps        int64     `json:"tx_bps"`
}

// Series is a router's history for one range.
type Series struct {
	Range   string  `json:"range"`
	StepSec int64   `json:"step_sec"`
	Points  []Point `json:"points"`
}

var ranges = map[string]struct{ span, step time.Duration }{
	"24h": {24 * time.Hour, 5 * time.Minute},
	"7d":  {7 * 24 * time.Hour, time.Hour},
	"30d": {30 * 24 * time.Hour, 4 * time.Hour},
}

// Metrics returns the chart series for range "24h", "7d" or "30d".
func (s *Service) Metrics(ctx context.Context, tenantID, routerID uuid.UUID, rng string) (Series, error) {
	r, ok := ranges[rng]
	if !ok {
		return Series{}, httpx.BadRequest("BAD_RANGE", "Range must be 24h, 7d or 30d.", "Pick one of the range tabs.")
	}
	out := Series{Range: rng, StepSec: int64(r.step / time.Second), Points: []Point{}}
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		if _, err := q.GetRouter(ctx, routerID); err != nil {
			if db.IsNotFound(err) {
				return httpx.NotFound("Router")
			}
			return err
		}
		rows, err := q.RouterMetricSeries(ctx, store.RouterMetricSeriesParams{
			Step: pgtype.Interval{Microseconds: r.step.Microseconds(), Valid: true}, RouterID: routerID, Since: s.now().Add(-r.span),
		})
		for _, p := range rows {
			out.Points = append(out.Points, Point{At: p.Bucket, CPULoad: p.CpuLoad, MemUsedPct: p.MemUsedPct, PPPoEUsers: p.PppoeUsers,
				HotspotUsers: p.HotspotUsers, RxBps: p.RxBps, TxBps: p.TxBps})
		}
		return err
	})
	return out, err
}

// Live is a router's latest sample (when it is less than 5 minutes old).
type Live struct {
	CPULoad      int16  `json:"cpu_load"`
	MemUsedPct   int16  `json:"mem_used_pct"`
	PPPoEUsers   int32  `json:"pppoe_users"`
	HotspotUsers int32  `json:"hotspot_users"`
	RxBps        *int64 `json:"rx_bps"`
	TxBps        *int64 `json:"tx_bps"`
	HighCPU      bool   `json:"high_cpu"`
}

// LiveMetrics returns the latest sample per router for the signed-in tenant.
func (s *Service) LiveMetrics(ctx context.Context, q *store.Queries) (map[uuid.UUID]Live, error) {
	rows, err := q.LatestRouterMetrics(ctx, s.now().Add(-5*time.Minute))
	out := make(map[uuid.UUID]Live, len(rows))
	for _, r := range rows {
		out[r.RouterID] = Live{CPULoad: r.CpuLoad, MemUsedPct: r.MemUsedPct, PPPoEUsers: r.PppoeUsers, HotspotUsers: r.HotspotUsers,
			RxBps: r.RxBps, TxBps: r.TxBps, HighCPU: r.CpuLoad >= HighCPU}
	}
	return out, err
}

// MapNeighbor is a device a router sees. RouterID is set when the device is
// one of the tenant's own routers (matched by RouterOS identity).
type MapNeighbor struct {
	Interface string     `json:"interface"`
	MAC       string     `json:"mac"`
	Identity  string     `json:"identity"`
	Address   string     `json:"address"`
	Platform  string     `json:"platform"`
	Board     string     `json:"board"`
	RouterID  *uuid.UUID `json:"router_id"`
}

// MapRouter is one router node.
type MapRouter struct {
	ID        uuid.UUID     `json:"id"`
	Name      string        `json:"name"`
	Status    string        `json:"status"`
	Board     string        `json:"board"`
	Live      *Live         `json:"live"`
	Neighbors []MapNeighbor `json:"neighbors"`
}

// MapSite groups routers by location.
type MapSite struct {
	ID      uuid.UUID   `json:"id"`
	Name    string      `json:"name"`
	Routers []MapRouter `json:"routers"`
}

// Map returns the tenant's sites, routers and what each router sees.
func (s *Service) Map(ctx context.Context, tenantID uuid.UUID) ([]MapSite, error) {
	var sites []MapSite
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		locs, err := q.ListLocations(ctx)
		if err != nil {
			return err
		}
		routers, err := q.ListRouters(ctx)
		if err != nil {
			return err
		}
		neighbors, err := q.ListRouterNeighbors(ctx)
		if err != nil {
			return err
		}
		live, err := s.LiveMetrics(ctx, q)
		if err != nil {
			return err
		}
		byName := map[string]uuid.UUID{}
		for _, r := range routers {
			byName[strings.ToLower(strings.TrimSpace(r.Name))] = r.ID
		}
		seen := map[uuid.UUID][]MapNeighbor{}
		for _, n := range neighbors {
			mn := MapNeighbor{Interface: n.Interface, MAC: n.MacAddress, Identity: deref(n.Identity), Address: deref(n.Address),
				Platform: deref(n.Platform), Board: deref(n.Board)}
			if id, ok := byName[strings.ToLower(strings.TrimSpace(mn.Identity))]; ok && id != n.RouterID {
				id := id
				mn.RouterID = &id
			}
			seen[n.RouterID] = append(seen[n.RouterID], mn)
		}
		idx := map[uuid.UUID]int{}
		for _, l := range locs {
			idx[l.ID] = len(sites)
			sites = append(sites, MapSite{ID: l.ID, Name: l.Name, Routers: []MapRouter{}})
		}
		for _, r := range routers {
			i, ok := idx[r.LocationID]
			if !ok {
				continue
			}
			mr := MapRouter{ID: r.ID, Name: r.Name, Status: r.Status, Board: deref(r.BoardName), Neighbors: seen[r.ID]}
			if mr.Neighbors == nil {
				mr.Neighbors = []MapNeighbor{}
			}
			if l, ok := live[r.ID]; ok {
				l := l
				mr.Live = &l
			}
			sites[i].Routers = append(sites[i].Routers, mr)
		}
		return nil
	})
	if sites == nil {
		sites = []MapSite{}
	}
	return sites, err
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// Audit returns a router's newest config_audit entries.
func (s *Service) Audit(ctx context.Context, tenantID, routerID uuid.UUID, limit int32) ([]store.ConfigAudit, error) {
	var rows []store.ConfigAudit
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		var err error
		rows, err = q.ListConfigAudit(ctx, store.ListConfigAuditParams{RouterID: &routerID, Limit: limit})
		return err
	})
	return rows, err
}
