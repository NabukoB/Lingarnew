// Package worker runs the background jobs of `api --role=worker`: renewals
// and expiry, reminder and Hotspot-expiry SMS, the M-Pesa pending sweep,
// router health polls, the WISP subscription lapse and housekeeping.
package worker

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/nabukob/lingarnew/wisp-saas/internal/customers"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/db"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/phone"
	"github.com/nabukob/lingarnew/wisp-saas/internal/sms"
	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
)

// DefaultHotspotExpiryTemplate is used when the WISP hasn't written one.
const DefaultHotspotExpiryTemplate = "Your {business} hotspot package ({package}) has expired. Buy another package to reconnect: {link}"

// Sweeper reconciles stuck STK payments (billing.Service).
type Sweeper interface {
	SweepPending(ctx context.Context) error
}

// Poller checks router health (router.Service).
type Poller interface {
	PollAll(ctx context.Context) error
}

type Worker struct {
	DB           *db.DB
	SMS          *sms.Service
	Disconnector customers.Disconnector
	Sweeper      Sweeper
	Poller       Poller
	PortalURL    func(t store.Tenant) string
	Now          func() time.Time
}

func (w *Worker) now() time.Time {
	if w.Now != nil {
		return w.Now()
	}
	return time.Now()
}

// Run starts every job on its schedule until ctx ends.
func (w *Worker) Run(ctx context.Context) {
	type job struct {
		name  string
		every time.Duration
		fn    func(context.Context) error
	}
	jobs := []job{
		{"mpesa_sweep", 30 * time.Second, w.sweep},
		{"router_poll", 60 * time.Second, w.poll},
		{"hotspot_expiry_sms", time.Minute, w.HotspotExpirySMS},
		{"renewals", 15 * time.Minute, w.Renewals},
		{"housekeeping", time.Hour, w.Housekeeping},
	}
	for _, j := range jobs {
		go func(j job) {
			t := time.NewTicker(j.every)
			defer t.Stop()
			for {
				start := time.Now()
				jctx, cancel := context.WithTimeout(ctx, j.every*4)
				if err := j.fn(jctx); err != nil && ctx.Err() == nil {
					slog.Error("job failed", "job", j.name, "err", err)
				} else {
					slog.Debug("job done", "job", j.name, "took", time.Since(start))
				}
				cancel()
				select {
				case <-ctx.Done():
					return
				case <-t.C:
				}
			}
		}(j)
	}
	<-ctx.Done()
}

func (w *Worker) sweep(ctx context.Context) error {
	if w.Sweeper == nil {
		return nil
	}
	return w.Sweeper.SweepPending(ctx)
}

func (w *Worker) poll(ctx context.Context) error {
	if w.Poller == nil {
		return nil
	}
	return w.Poller.PollAll(ctx)
}

func (w *Worker) tenants(ctx context.Context) ([]uuid.UUID, error) {
	var ids []uuid.UUID
	err := w.DB.WithoutTenant(ctx, func(q *store.Queries) error {
		var err error
		ids, err = q.ActiveTenantIDs(ctx)
		return err
	})
	return ids, err
}

// forEachTenant runs fn per tenant; one tenant failing doesn't stop the rest.
func (w *Worker) forEachTenant(ctx context.Context, name string, fn func(context.Context, uuid.UUID) error) error {
	ids, err := w.tenants(ctx)
	if err != nil {
		return err
	}
	failed := 0
	for _, id := range ids {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if err := fn(ctx, id); err != nil {
			failed++
			slog.Error(name, "tenant_id", id, "err", err)
		}
	}
	if failed > 0 {
		return fmt.Errorf("%s failed for %d of %d tenants", name, failed, len(ids))
	}
	return nil
}

// Renewals expires accounts whose period (plus grace) is over, kicks them off,
// and sends 3-day and 1-day reminders.
func (w *Worker) Renewals(ctx context.Context) error {
	return w.forEachTenant(ctx, "renewals", w.renewTenant)
}

type reminder struct {
	to, body string
	subID    uuid.UUID
	stage    int32
}

func (w *Worker) renewTenant(ctx context.Context, tenantID uuid.UUID) error {
	var (
		expired   []store.Subscriber
		reminders []reminder
	)
	err := w.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		t, err := q.GetTenant(ctx)
		if err != nil {
			return err
		}
		expired, err = q.ListExpiredActive(ctx, t.GraceHours)
		if err != nil {
			return err
		}
		for _, s := range expired {
			if err := q.SetSubscriberStatus(ctx, store.SetSubscriberStatusParams{ID: s.ID, Status: "expired"}); err != nil {
				return err
			}
		}
		if !t.ReminderSmsEnabled {
			return nil
		}
		cands, err := q.ListReminderCandidates(ctx)
		if err != nil {
			return err
		}
		loc := location(t.Timezone)
		for _, c := range cands {
			stage := int32(1)
			if c.NextRenewalAt.Sub(w.now()) <= 24*time.Hour {
				stage = 2
			}
			reminders = append(reminders, reminder{to: c.PhoneNumber, subID: c.ID, stage: stage,
				body: ReminderText(t, c.FullName, c.PppoeUsername, deref(c.PlanName), c.PlanPriceCents, c.CreditCents, c.NextRenewalAt.In(loc))})
		}
		return nil
	})
	if err != nil {
		return err
	}
	for _, s := range expired {
		if w.Disconnector == nil {
			break
		}
		if err := w.Disconnector.Disconnect(ctx, tenantID, s.PppoeUsername, "renewal expired"); err != nil {
			slog.Warn("disconnect expired subscriber", "tenant_id", tenantID, "subscriber_id", s.ID, "err", err)
		}
	}
	for _, r := range reminders {
		res, err := w.SMS.Send(ctx, tenantID, r.to, r.body, "renewal_reminder")
		if err != nil && res != sms.SendFailed {
			return err
		}
		if res == sms.NoCredit {
			break // the dashboard banner tells the WISP to top up
		}
		if err := w.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
			return q.SetReminderStage(ctx, store.SetReminderStageParams{ID: r.subID, ReminderStage: r.stage})
		}); err != nil {
			return err
		}
	}
	return nil
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func location(tz string) *time.Location {
	if loc, err := time.LoadLocation(tz); err == nil {
		return loc
	}
	return time.FixedZone("EAT", 3*60*60)
}

func firstName(full string) string {
	if f := strings.Fields(full); len(f) > 0 {
		return f[0]
	}
	return "Hi"
}

// ReminderText is the renewal reminder SMS.
func ReminderText(t store.Tenant, fullName, account, plan string, priceCents *int32, creditCents int32, due time.Time) string {
	amount := ""
	if priceCents != nil {
		if due := *priceCents - creditCents; due > 0 {
			amount = fmt.Sprintf("KSh %d ", due/100)
		}
	}
	when := due.Format("Mon 2 Jan")
	var pay string
	if t.MpesaShortcodeType == "paybill" && t.MpesaShortcode != nil {
		pay = fmt.Sprintf("Pay %svia M-Pesa Paybill %s, Account %s.", amount, *t.MpesaShortcode, account)
	} else if t.SupportPhone != nil {
		pay = fmt.Sprintf("To pay %scall %s.", amount, phone.Pretty(*t.SupportPhone))
	} else {
		pay = "Contact us to pay."
	}
	name := strings.TrimSpace(plan)
	if name != "" {
		name += " "
	}
	return fmt.Sprintf("%s, your %s%s internet renews %s. %s", firstName(fullName), name, t.Name, when, pay)
}

// HotspotExpirySMS sends the opt-in "your package has expired" SMS, at most
// once per purchase and only after the time is used up.
func (w *Worker) HotspotExpirySMS(ctx context.Context) error {
	return w.forEachTenant(ctx, "hotspot_expiry_sms", func(ctx context.Context, tenantID uuid.UUID) error {
		var (
			t       store.Tenant
			notices []store.ListExpiryNoticesRow
		)
		err := w.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
			var err error
			t, err = q.GetTenant(ctx)
			if err != nil || !t.HotspotExpirySmsEnabled {
				return err
			}
			notices, err = q.ListExpiryNotices(ctx)
			return err
		})
		if err != nil || len(notices) == 0 {
			return err
		}
		tmpl := DefaultHotspotExpiryTemplate
		if t.HotspotExpirySmsTemplate != nil && strings.TrimSpace(*t.HotspotExpirySmsTemplate) != "" {
			tmpl = *t.HotspotExpirySmsTemplate
		}
		link := ""
		if w.PortalURL != nil {
			link = w.PortalURL(t)
		}
		support := ""
		if t.SupportPhone != nil {
			support = phone.Pretty(*t.SupportPhone)
		}
		for _, n := range notices {
			body := sms.Render(tmpl, map[string]string{"business": t.Name, "package": n.PlanName, "link": link, "code": deref(n.MpesaReceiptNumber), "support": support})
			res, err := w.SMS.Send(ctx, tenantID, *n.PhoneNumber, body, "hotspot_expiry")
			if res == sms.NoCredit {
				return nil // retried while still within the day, if the WISP tops up
			}
			if err != nil && res != sms.SendFailed {
				return err
			}
			// Sent, or undeliverable (not charged): never try this purchase again.
			if err := w.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error { return q.MarkExpirySMSSent(ctx, n.ID) }); err != nil {
				return err
			}
		}
		return nil
	})
}

// Housekeeping lapses unpaid WISP subscriptions, closes sessions whose
// router stopped sending accounting, and deletes expired dashboard logins.
func (w *Worker) Housekeeping(ctx context.Context) error {
	return w.forEachTenant(ctx, "housekeeping", func(ctx context.Context, tenantID uuid.UUID) error {
		return w.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
			if _, err := q.LapseSubscription(ctx); err != nil && !db.IsNotFound(err) {
				return err
			}
			// Interim updates come every 5 minutes; 20 minutes of silence means the session is gone.
			if err := q.CloseStaleSessions(ctx, w.now().Add(-20*time.Minute)); err != nil {
				return err
			}
			return q.DeleteExpiredAuthSessions(ctx)
		})
	})
}

// Alerts implements router.Alerter by SMSing the WISP's support phone.
type Alerts struct {
	DB  *db.DB
	SMS *sms.Service
}

func (a *Alerts) RouterOffline(ctx context.Context, tenantID uuid.UUID, routerName string, since time.Time) {
	var t store.Tenant
	if err := a.DB.WithTenant(ctx, tenantID, func(q *store.Queries) error {
		var err error
		t, err = q.GetTenant(ctx)
		return err
	}); err != nil || t.SupportPhone == nil {
		return
	}
	body := fmt.Sprintf("%s: router %s went offline at %s. Check its power and internet.", t.Name, routerName, since.In(location(t.Timezone)).Format("15:04"))
	if _, err := a.SMS.Send(ctx, tenantID, *t.SupportPhone, body, "router_alert"); err != nil {
		slog.Warn("router offline SMS", "tenant_id", tenantID, "err", err)
	}
}
