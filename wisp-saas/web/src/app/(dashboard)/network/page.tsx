import { Plus } from "lucide-react";
import Link from "next/link";
import { AssistantBar } from "@/components/AssistantBar";
import { RoutersRing } from "@/components/NetworkCard";
import { RouterStatusDot, RouterStatusPill } from "@/components/ui";
import { getRouters } from "@/lib/api";

export const metadata = { title: "Network · Mtandao" };

export default async function NetworkPage() {
  const routers = await getRouters();
  const online = routers.filter((r) => r.status !== "offline").length;
  const offline = routers.length - online;
  const users = routers.reduce((n, r) => n + (r.users ?? 0), 0);

  return (
    <>
      <header className="flex h-[52px] items-center">
        <h1 className="text-2xl font-extrabold tracking-tight">Network</h1>
        <Link href="/routers/new" aria-label="Add router" className="ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-brand">
          <Plus aria-hidden size={20} strokeWidth={2.6} />
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-5">
        <div className="flex flex-col gap-4">
          <section aria-label="Routers online" className="flex items-center gap-5 rounded-card bg-white px-5 py-4 shadow-card">
            <RoutersRing online={online} total={routers.length} size={96} />
            <div className="flex flex-col gap-2 text-sm font-bold">
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-green-600" />{online} online</span>
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />{offline} offline</span>
              <span className="text-slate-500">{users} users</span>
            </div>
          </section>
          <AssistantBar placeholder="Ask about your network…" />
        </div>

        <section aria-label="Routers" className="rounded-card bg-white px-5 py-1 shadow-card">
          <ul>
            {routers.map((r, i) => (
              <li key={r.id} className={`flex items-center gap-3 py-3.5 ${i ? "border-t border-line" : ""}`}>
                <RouterStatusDot status={r.status} />
                <div className="flex min-w-0 flex-grow flex-col">
                  <span className="truncate text-sm font-bold">{r.name}</span>
                  <span className="text-xs font-semibold text-slate-500">
                    {r.status === "offline" ? `Offline ${r.offlineMinutes}m` : r.location}
                  </span>
                </div>
                <span className="tabular text-xs font-semibold text-slate-500">{r.users ?? "—"}</span>
                <RouterStatusPill status={r.status} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
