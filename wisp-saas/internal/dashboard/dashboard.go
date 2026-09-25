// Package dashboard computes the numbers on the WISP's home and money screens.
// Money is returned in whole KES (the UI never shows cents); days and hours
// follow the tenant's timezone.
package dashboard

import (
	"context"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/nabukob/lingarnew/wisp-saas/internal/auth"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/db"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/httpx"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
)

type Service struct {
	DB  *db.DB
	Now func() time.Time
}

func (s *Service) now() time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

// Stat is a value with the comparable value 24 hours earlier.
type Stat struct {
	Value int64 `json:"value"`
	Prev  int64 `json:"prev"`
}

type Overview struct {
	MpesaToday     int64   `json:"mpesaToday"`
	MpesaTodayPrev int64   `json:"mpesaTodayPrev"`
	Sparkline      []int64 `json:"sparkline"`
	Online         Stat    `json:"online"`
	PPPoE          Stat    `json:"pppoe"`
	HotspotSales   Stat    `json:"hotspotSales"`
	OnTimeRate     Stat    `json:"onTimeRate"`
	Unmatched      int32   `json:"unmatched"`
	RenewalsDue    int32   `json:"renewalsDue"`
	SMSCredits     int32   `json:"smsCredits"`
	Routers        struct {
		Online  int32 `json:"online"`
		Total   int32 `json:"total"`
		Offline int32 `json:"offline"`
	} `json:"routers"`
}

func location(tz string) *time.Location {
	if l, err := time.LoadLocation(tz); err == nil {
		return l
	}
	return time.FixedZone("EAT", 3*3600)
}

func startOfDay(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, t.Location())
}

func interval(d time.Duration) pgtype.Interval {
	return pgtype.Interval{Microseconds: d.Microseconds(), Valid: true}
}

func kes(cents int64) int64 { return cents / 100 }

// Overview is GET /v1/dashboard/overview.
func (s *Service) Overview(ctx context.Context, tenantID uuid.UUID) (Overview, error) {
	var o Overview
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		t, err := q.GetTenant(ctx)
		if err != nil {
			return err
		}
		now := s.now().In(location(t.Timezone))
		today := startOfDay(now)
		yday, dayAgo := today.AddDate(0, 0, -1), now.Add(-24*time.Hour)

		cur, err := q.RevenueBetween(ctx, store.RevenueBetweenParams{Since: today, Until: now})
		if err != nil {
			return err
		}
		prev, err := q.RevenueBetween(ctx, store.RevenueBetweenParams{Since: yday, Until: dayAgo})
		if err != nil {
			return err
		}
		o.MpesaToday, o.MpesaTodayPrev = kes(cur), kes(prev)

		buckets, err := q.RevenueBuckets(ctx, store.RevenueBucketsParams{Bucket: interval(time.Hour), Since: today, Until: now})
		if err != nil {
			return err
		}
		o.Sparkline = fill(buckets, today, time.Hour, now.Hour()+1)
		running := int64(0)
		for i, v := range o.Sparkline { // cumulative: the line climbs through the day
			running += v
			o.Sparkline[i] = running
		}

		on, err := q.CountActiveSessionsBetween(ctx, now)
		if err != nil {
			return err
		}
		onPrev, err := q.CountActiveSessionsBetween(ctx, dayAgo)
		if err != nil {
			return err
		}
		o.Online = Stat{int64(on), int64(onPrev)}

		counts, err := q.CountSubscribersByStatus(ctx)
		if err != nil {
			return err
		}
		for _, c := range counts {
			if c.Status == "active" {
				o.PPPoE = Stat{int64(c.N), int64(c.N)}
			}
		}
		hs, err := q.HotspotSalesSince(ctx, store.HotspotSalesSinceParams{Since: today, Until: now})
		if err != nil {
			return err
		}
		hsPrev, err := q.HotspotSalesSince(ctx, store.HotspotSalesSinceParams{Since: yday, Until: dayAgo})
		if err != nil {
			return err
		}
		o.HotspotSales = Stat{int64(hs), int64(hsPrev)}

		rate, err := q.OnTimeRate(ctx)
		if err != nil {
			return err
		}
		if rate.Total > 0 {
			pct := int64(rate.OnTime) * 100 / int64(rate.Total)
			o.OnTimeRate = Stat{pct, pct}
		}
		if o.Unmatched, err = q.CountUnmatched(ctx); err != nil {
			return err
		}
		if o.RenewalsDue, err = q.CountRenewalsDue(ctx); err != nil {
			return err
		}
		o.SMSCredits = t.SmsCredits
		rs, err := q.CountRoutersByStatus(ctx)
		if err != nil {
			return err
		}
		for _, r := range rs {
			o.Routers.Total += r.N
			switch r.Status {
			case "online", "degraded":
				o.Routers.Online += r.N
			case "offline":
				o.Routers.Offline += r.N
			}
		}
		return nil
	})
	return o, err
}

// fill turns sparse buckets into n values starting at since.
func fill(rows []store.RevenueBucketsRow, since time.Time, step time.Duration, n int) []int64 {
	out := make([]int64, n)
	for _, r := range rows {
		i := int(r.Bucket.Sub(since) / step)
		if i >= 0 && i < n {
			out[i] += kes(r.Cents)
		}
	}
	return out
}

type Series struct {
	Labels   [3]string `json:"labels"`
	Current  []int64   `json:"current"`
	Previous []int64   `json:"previous"`
}

type Split struct {
	Label string  `json:"label"`
	Share float64 `json:"share"`
	KES   int64   `json:"kes"`
	Color string  `json:"color"`
}

type TopPackage struct {
	Name    string `json:"name"`
	Sold    int32  `json:"sold"`
	Revenue int64  `json:"revenue"`
}

type Revenue struct {
	Period string       `json:"period"`
	Total  int64        `json:"total"`
	Series Series       `json:"series"`
	Split  []Split      `json:"split"`
	Top    []TopPackage `json:"top"`
}

// Window returns the current range, bucket size, bucket count, the previous
// range's start and the three axis labels for a period.
func Window(period string, now time.Time) (since time.Time, step time.Duration, n, elapsed int, prevSince time.Time, labels [3]string) {
	today := startOfDay(now)
	switch period {
	case "week":
		since = today.AddDate(0, 0, -6)
		step, n = 24*time.Hour, 7
		labels = [3]string{since.Format("Mon"), since.AddDate(0, 0, 3).Format("Mon"), "Today"}
	case "month":
		since = today.AddDate(0, 0, -29)
		step, n = 24*time.Hour, 30
		labels = [3]string{since.Format("2 Jan"), since.AddDate(0, 0, 15).Format("2"), now.Format("2")}
	default:
		since = today
		step, n = time.Hour, 24
		labels = [3]string{"00:00", "12:00", "Now"}
	}
	elapsed = int(now.Sub(since)/step) + 1
	if elapsed > n {
		elapsed = n
	}
	prevSince = since.Add(-time.Duration(n) * step)
	return
}

// Revenue is GET /v1/dashboard/revenue?period=day|week|month.
func (s *Service) Revenue(ctx context.Context, tenantID uuid.UUID, period string) (Revenue, error) {
	if period != "week" && period != "month" {
		period = "day"
	}
	out := Revenue{Period: period, Split: []Split{}, Top: []TopPackage{}}
	err := s.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		t, err := q.GetTenant(ctx)
		if err != nil {
			return err
		}
		now := s.now().In(location(t.Timezone))
		since, step, n, elapsed, prevSince, labels := Window(period, now)
		cur, err := q.RevenueBuckets(ctx, store.RevenueBucketsParams{Bucket: interval(step), Since: since, Until: now})
		if err != nil {
			return err
		}
		prev, err := q.RevenueBuckets(ctx, store.RevenueBucketsParams{Bucket: interval(step), Since: prevSince, Until: since})
		if err != nil {
			return err
		}
		out.Series = Series{Labels: labels, Current: fill(cur, since, step, elapsed), Previous: fill(prev, prevSince, step, n)}

		split, err := q.RevenueSplit(ctx, store.RevenueSplitParams{Since: since, Until: now})
		if err != nil {
			return err
		}
		vouchers, err := q.VoucherValueBetween(ctx, store.VoucherValueBetweenParams{Since: since, Until: now})
		if err != nil {
			return err
		}
		by := map[string]int64{"vouchers": vouchers}
		for _, r := range split {
			by[r.Kind] += r.Cents
		}
		total := by["pppoe"] + by["hotspot"] + by["vouchers"]
		out.Total = kes(by["pppoe"] + by["hotspot"])
		for _, k := range []struct{ key, label, color string }{{"pppoe", "PPPoE", "#2563eb"}, {"hotspot", "Hotspot", "#16a34a"}, {"vouchers", "Vouchers", "#ea580c"}} {
			share := 0.0
			if total > 0 {
				share = float64(by[k.key]) / float64(total)
			}
			out.Split = append(out.Split, Split{Label: k.label, Share: share, KES: kes(by[k.key]), Color: k.color})
		}
		top, err := q.TopPlans(ctx, store.TopPlansParams{Since: since, Until: now, Lim: 3})
		if err != nil {
			return err
		}
		for _, p := range top {
			out.Top = append(out.Top, TopPackage{Name: p.Name, Sold: p.Sold, Revenue: kes(p.Cents)})
		}
		return nil
	})
	return out, err
}

func (s *Service) Routes(r chi.Router) {
	r.Get("/v1/dashboard/overview", func(w http.ResponseWriter, r *http.Request) {
		o, err := s.Overview(r.Context(), auth.TenantID(r.Context()))
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusOK, o)
	})
	r.Get("/v1/dashboard/revenue", func(w http.ResponseWriter, r *http.Request) {
		rev, err := s.Revenue(r.Context(), auth.TenantID(r.Context()), r.URL.Query().Get("period"))
		if err != nil {
			httpx.Fail(w, r, err)
			return
		}
		httpx.JSON(w, http.StatusOK, rev)
	})
}
