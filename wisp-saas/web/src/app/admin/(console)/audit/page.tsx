import Link from "next/link";
import { Card } from "@/components/ui/card";
import { getAdminAudit } from "@/lib/admin-api";
import { ago, auditText } from "@/lib/admin-types";
import { longDate } from "@/lib/mappers";

export default async function AdminAuditPage() {
  const entries = await getAdminAudit();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Audit</h1>
      <Card className="px-5 py-2">
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm font-semibold text-muted-foreground">Nothing yet</p>
        ) : (
          <ul>
            {entries.map((a, i) => (
              <li key={a.id} className={`flex flex-wrap items-center gap-x-3 gap-y-0.5 py-3 ${i ? "border-t border-line" : ""}`}>
                <span className="text-sm font-bold">{auditText(a)}</span>
                {a.tenant_id && a.tenant_name && (
                  <Link href={`/admin/tenants/${a.tenant_id}`} className="text-sm font-bold text-primary hover:underline">
                    {a.tenant_name}
                  </Link>
                )}
                {typeof a.payload.note === "string" && a.payload.note && <span className="text-sm text-muted-foreground">“{a.payload.note}”</span>}
                <span className="ml-auto text-xs font-semibold text-muted-foreground" title={longDate(a.created_at) ?? undefined}>
                  {a.admin_email} · {ago(a.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
