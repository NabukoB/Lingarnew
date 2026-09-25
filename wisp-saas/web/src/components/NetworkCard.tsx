import { Plus } from "lucide-react";
import Link from "next/link";
import type { RouterRow } from "@/lib/types";
import { RouterStatusDot, RouterStatusPill } from "./ui";

export function RoutersRing({ online, total, size = 76 }: { online: number; total: number; size?: number }) {
  const c = 2 * Math.PI * 40;
  const off = total === 0 ? c : c * (1 - online / total);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 96 96" role="img" aria-label={`${online} of ${total} routers online`} className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx="48" cy="48" r="40" fill="none" stroke="#fee2e2" strokeWidth={11} />
        <circle cx="48" cy="48" r="40" fill="none" stroke="#16a34a" strokeWidth={11} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold">
        {online}/{total}
      </span>
    </div>
  );
}

export function NetworkCard({ routers }: { routers: RouterRow[] }) {
  const online = routers.filter((r) => r.status !== "offline").length;
  const users = routers.reduce((n, r) => n + (r.users ?? 0), 0);
  return (
    <section aria-label="Network" className="flex flex-col gap-1.5 rounded-card bg-white px-[22px] pb-3.5 pt-[22px] shadow-card">
      <div className="flex items-center gap-4 pb-2">
        <RoutersRing online={online} total={routers.length} />
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-extrabold">Network</h2>
          <span className="text-[13px] font-semibold text-slate-500">{users} users online</span>
        </div>
        <Link href="/routers/new" aria-label="Add router" className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100">
          <Plus aria-hidden size={18} strokeWidth={2.6} />
        </Link>
      </div>
      <ul>
        {routers.map((r) => (
          <li key={r.id} className="flex items-center gap-3 border-t border-line py-2.5">
            <RouterStatusDot status={r.status} />
            <span className="min-w-0 flex-grow truncate text-sm font-bold">{r.name}</span>
            <span className="tabular text-xs font-semibold text-slate-500">{r.users ?? "—"}</span>
            <RouterStatusPill status={r.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}
