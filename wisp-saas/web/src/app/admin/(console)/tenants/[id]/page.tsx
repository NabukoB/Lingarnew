import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TenantActions } from "@/components/admin/TenantActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAdminTenant } from "@/lib/admin-api";
import { ago, auditText, standingLabel, standingTone } from "@/lib/admin-types";
import { formatKsh } from "@/lib/format";
import { longDate, prettyPhone, routerStatus } from "@/lib/mappers";

const statusDot: Record<string, string> = { online: "bg-green-500", slow: "bg-amber-500", offline: "bg-red-500", pending: "bg-slate-400" };

export default async function AdminTenantPage({ params }: { params: { id: string } }) {
  const t = await getAdminTenant(params.id);
  if (!t) notFound();
  const trial = t.standing === "trial" || t.standing === "trial_ended";
  const facts: [string, string][] = [
    ["Email", t.email],
    ["Support phone", t.support_phone ? prettyPhone(t.support_phone) : "—"],
    ["Account prefix", t.account_prefix],
    ["M-Pesa", `${t.mpesa_mode === "own" ? "Own app" : "Ours"} · ${t.mpesa_shortcode_type} ${t.mpesa_shortcode ?? "—"} · ${t.mpesa_env}`],
    ["Portal", t.portal_domain ?? `slug ${t.slug}`],
    ["Joined", longDate(t.created_at) ?? "—"],
    [trial ? "Trial ends" : "Paid until", longDate(trial ? t.trial_ends_at : t.subscription_expires_at) ?? "—"],
    ["Last sign-in", ago(t.last_login_at)],
  ];
  const stats: [string, string][] = [
    ["Customers", `${t.active_subscribers.toLocaleString("en-KE")} / ${t.subscribers.toLocaleString("en-KE")}`],
    ["Their M-Pesa 30d", formatKsh(t.customer_payments_30d_kes)],
    ["SMS credits", t.sms_credits.toLocaleString("en-KE")],
    ["Routers", `${t.routers.filter((r) => r.status === "online").length}/${t.routers.length}`],
  ];

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <header className="flex flex-wrap items-center gap-3">
        <Button asChild variant="secondary" size="icon" aria-label="Back">
          <Link href="/admin/tenants">
            <ArrowLeft aria-hidden size={20} strokeWidth={2.2} />
          </Link>
        </Button>
        <h1 className="text-2xl font-extrabold tracking-tight">{t.name}</h1>
        <Badge variant={standingTone(t.standing)}>{standingLabel[t.standing]}</Badge>
        <div className="ml-auto">
          <TenantActions tenantId={t.id} paying={t.subscription_status === "active"} />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
        {stats.map(([k, v]) => (
          <Card key={k} className="flex flex-col gap-1 p-5">
            <span className="text-xs font-bold text-muted-foreground">{k}</span>
            <span className="tabular text-xl font-extrabold tracking-tight">{v}</span>
          </Card>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-5">
        <Card className="p-5">
          <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {facts.map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-muted/60 px-3 py-2.5">
                <dt className="text-[11px] text-muted-foreground">{k}</dt>
                <dd className="mt-0.5 truncate text-sm font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="px-5 py-4">
          <h2 className="pb-2 text-sm font-extrabold">Routers</h2>
          {t.routers.length === 0 ? (
            <p className="py-2 text-sm font-semibold text-muted-foreground">None yet</p>
          ) : (
            <ul>
              {t.routers.map((r, i) => (
                <li key={r.id} className={`flex items-center gap-3 py-2.5 ${i ? "border-t border-line" : ""}`}>
                  <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${statusDot[routerStatus(r.status as never)]}`} />
                  <span className="flex min-w-0 flex-grow flex-col">
                    <span className="truncate text-sm font-bold">{r.name}</span>
                    <span className="truncate text-xs font-semibold text-muted-foreground">
                      {[r.location, r.board_name, r.firmware_version].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">{r.status === "pending" ? "Not connected" : `${r.status} ${ago(r.status_changed_at)}`}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="px-5 py-4">
          <h2 className="pb-2 text-sm font-extrabold">Payments to us</h2>
          {t.platform_payments.length === 0 ? (
            <p className="py-2 text-sm font-semibold text-muted-foreground">None yet</p>
          ) : (
            <ul>
              {t.platform_payments.map((p, i) => (
                <li key={p.id} className={`flex items-center gap-3 py-2.5 ${i ? "border-t border-line" : ""}`}>
                  <span className="flex min-w-0 flex-grow flex-col">
                    <span className="text-sm font-bold">{p.purpose === "sms_credits" ? "SMS credits" : "Subscription"}</span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {longDate(p.created_at)} {p.mpesa_receipt_number ? `· ${p.mpesa_receipt_number}` : ""}
                    </span>
                  </span>
                  <Badge variant={p.status === "success" ? "success" : p.status === "pending" ? "warning" : "danger"}>{p.status}</Badge>
                  <span className="tabular w-[96px] text-right text-sm font-extrabold">{formatKsh(p.amount_cents / 100)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="px-5 py-4">
          <h2 className="pb-2 text-sm font-extrabold">Staff changes</h2>
          {t.audit.length === 0 ? (
            <p className="py-2 text-sm font-semibold text-muted-foreground">None</p>
          ) : (
            <ul>
              {t.audit.map((a, i) => (
                <li key={a.id} className={`flex flex-col py-2.5 ${i ? "border-t border-line" : ""}`}>
                  <span className="text-sm font-bold">{auditText(a)}</span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {a.admin_email} · {ago(a.created_at)}
                    {typeof a.payload.note === "string" && a.payload.note ? ` · “${a.payload.note}”` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
