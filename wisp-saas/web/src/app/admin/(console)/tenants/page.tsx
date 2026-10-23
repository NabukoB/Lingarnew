import { Search } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { inputBase } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { getAdminTenants } from "@/lib/admin-api";
import { ago, standingLabel, standingTone, type Standing } from "@/lib/admin-types";
import { shortDate } from "@/lib/mappers";
import { cn } from "@/lib/utils";

const filters = [
  { value: "", label: "All" },
  { value: "paying", label: "Paying" },
  { value: "trial", label: "Trial" },
  { value: "unpaid", label: "Unpaid" },
];

export default async function AdminTenantsPage({ searchParams }: { searchParams: { q?: string; standing?: string } }) {
  const q = (searchParams.q ?? "").slice(0, 80);
  const standing = filters.some((f) => f.value === searchParams.standing) ? searchParams.standing! : "";
  const tenants = await getAdminTenants(q, standing);
  const href = (s: string) => `/admin/tenants?${new URLSearchParams({ ...(q ? { q } : {}), ...(s ? { standing: s } : {}) })}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">ISPs</h1>
        <form className="relative ml-auto w-full sm:w-[300px]" action="/admin/tenants">
          {standing && <input type="hidden" name="standing" value={standing} />}
          <Search aria-hidden size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="q" className="sr-only">
            Search ISPs
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Name, email or slug" className={cn(inputBase, "pl-10")} />
        </form>
      </div>
      <Segmented id="tenant-filter" label="Standing" tone="white" className="self-start" items={filters.map((f) => ({ ...f, href: href(f.value) }))} value={standing} />

      <Card className="overflow-x-auto px-2 py-1 lg:px-4">
        {tenants.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm font-semibold text-muted-foreground">No ISPs match</p>
        ) : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="text-xs font-bold text-muted-foreground">
                <th className="px-2 py-3 font-bold">ISP</th>
                <th className="px-2 py-3 font-bold">Standing</th>
                <th className="px-2 py-3 text-right font-bold">Routers</th>
                <th className="px-2 py-3 text-right font-bold">Customers</th>
                <th className="px-2 py-3 text-right font-bold">SMS</th>
                <th className="px-2 py-3 font-bold">Until</th>
                <th className="px-2 py-3 font-bold">Last sign-in</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => {
                const until = t.standing === "trial" || t.standing === "trial_ended" ? t.trial_ends_at : t.subscription_expires_at;
                return (
                  <tr key={t.id} className="border-t border-line transition-colors hover:bg-muted/50">
                    <td className="px-2 py-3">
                      <Link href={`/admin/tenants/${t.id}`} className="flex flex-col">
                        <span className="font-bold hover:text-primary">{t.name}</span>
                        <span className="text-xs font-semibold text-muted-foreground">{t.email}</span>
                      </Link>
                    </td>
                    <td className="px-2 py-3">
                      <Badge variant={standingTone(t.standing as Standing)}>{standingLabel[t.standing as Standing]}</Badge>
                    </td>
                    <td className="tabular px-2 py-3 text-right font-semibold">
                      {t.routers_online}/{t.routers}
                      {t.routers_offline > 0 && <span className="ml-1.5 text-xs font-bold text-red-600">{t.routers_offline} down</span>}
                    </td>
                    <td className="tabular px-2 py-3 text-right font-semibold">{t.active_subscribers.toLocaleString("en-KE")}</td>
                    <td className={cn("tabular px-2 py-3 text-right font-semibold", t.sms_credits === 0 && "text-amber-700")}>{t.sms_credits.toLocaleString("en-KE")}</td>
                    <td className="px-2 py-3 font-semibold">{until ? shortDate(until) : "—"}</td>
                    <td className="px-2 py-3 font-semibold text-muted-foreground">{ago(t.last_login_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
