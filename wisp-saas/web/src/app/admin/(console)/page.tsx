import { AlertTriangle, CreditCard, MessageSquareWarning, Router, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { IncomeChart } from "@/components/admin/IncomeChart";
import { Card } from "@/components/ui/card";
import { ago } from "@/lib/admin-types";
import { getAdminOverview } from "@/lib/admin-api";
import { formatKsh } from "@/lib/format";

export default async function AdminOverviewPage() {
  const o = await getAdminOverview();
  const c = o.counts;
  const tiles = [
    { label: "ISPs", value: c.tenants, sub: `${c.paying} paying · ${c.on_trial} trial`, icon: Users },
    { label: "Routers online", value: `${c.routers_online}/${c.routers}`, sub: c.routers_offline ? `${c.routers_offline} offline` : "All up", icon: Router, bad: c.routers_offline > 0 },
    { label: "End customers", value: c.active_subscribers.toLocaleString("en-KE"), sub: "Active PPPoE", icon: CreditCard },
    { label: "Assistant today", value: c.assistant_questions, sub: "Questions", icon: Sparkles },
  ];
  const problems = [
    { label: "Trials ending in 7 days", n: c.trials_ending, href: "/admin/tenants?standing=trial" },
    { label: "Lapsed or expired", n: c.lapsed, href: "/admin/tenants?standing=unpaid" },
    { label: "Payments stuck pending > 10 min", n: c.stuck_payments },
    { label: "Unmatched Paybill payments", n: c.unmatched_payments },
    { label: "SMS failed in 24 h", n: c.failed_sms },
  ];

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] lg:gap-5">
        <Card className="flex flex-col justify-between gap-6 bg-gradient-to-br from-blue-600 to-blue-500 p-6 text-white shadow-brand">
          <span className="text-sm font-bold text-white/80">Our income · 30 days</span>
          <span className="text-[40px] font-extrabold leading-none tracking-tight">{formatKsh(o.income_30d_kes)}</span>
          <span className="text-xs font-semibold text-white/70">Subscriptions + SMS credits</span>
        </Card>
        <div className="grid grid-cols-2 gap-4 lg:gap-5">
          {tiles.map((t) => (
            <Card key={t.label} className="flex flex-col gap-3 p-5">
              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${t.bad ? "bg-red-50 text-red-600" : "bg-accent text-primary"}`}>
                <t.icon aria-hidden size={19} strokeWidth={2.2} />
              </span>
              <span className="text-2xl font-extrabold tracking-tight">{t.value}</span>
              <span className="flex flex-col">
                <span className="text-sm font-bold">{t.label}</span>
                <span className={`text-xs font-semibold ${t.bad ? "text-red-600" : "text-muted-foreground"}`}>{t.sub}</span>
              </span>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] lg:gap-5">
        <Card className="p-5">
          <IncomeChart income={o.income} />
        </Card>
        <Card className="flex flex-col gap-1 px-5 py-4">
          <h2 className="flex items-center gap-2 pb-1 text-sm font-extrabold">
            <AlertTriangle aria-hidden size={16} className="text-amber-600" />
            Needs attention
          </h2>
          {problems.map((p) => {
            const row = (
              <span className="flex items-center gap-3 py-2">
                <span className={`h-2 w-2 rounded-full ${p.n ? "bg-amber-500" : "bg-green-500"}`} aria-hidden />
                <span className="flex-grow text-sm font-semibold">{p.label}</span>
                <span className="tabular text-sm font-extrabold">{p.n}</span>
              </span>
            );
            return p.href ? (
              <Link key={p.label} href={p.href} className="rounded-xl px-1 transition hover:bg-muted/60">
                {row}
              </Link>
            ) : (
              <div key={p.label} className="px-1">
                {row}
              </div>
            );
          })}
        </Card>
      </div>

      <Card className="px-5 py-4">
        <h2 className="flex items-center gap-2 pb-2 text-sm font-extrabold">
          <MessageSquareWarning aria-hidden size={16} className="text-red-600" />
          Offline routers
        </h2>
        {o.offline_routers.length === 0 ? (
          <p className="py-2 text-sm font-semibold text-muted-foreground">None</p>
        ) : (
          <ul>
            {o.offline_routers.map((r, i) => (
              <li key={r.id} className={i ? "border-t border-line" : ""}>
                <Link href={`/admin/tenants/${r.tenant_id}`} className="flex items-center gap-3 rounded-xl px-1 py-3 transition hover:bg-muted/60">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <span className="flex min-w-0 flex-grow flex-col">
                    <span className="truncate text-sm font-bold">{r.name}</span>
                    <span className="truncate text-xs font-semibold text-muted-foreground">{r.tenant_name}</span>
                  </span>
                  <span className="text-xs font-semibold text-red-600">{ago(r.status_changed_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
