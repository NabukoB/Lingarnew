import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { RouterRow } from "@/lib/types";

export function AlertRow({ routers }: { routers: RouterRow[] }) {
  const down = routers.find((r) => r.status === "offline");
  if (!down) return null;
  return (
    <Link
      href="/network"
      className="flex h-[60px] items-center gap-3 rounded-tile bg-white px-[18px] shadow-card transition hover:shadow-soft"
    >
      <span aria-hidden className="ml-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-[5px] ring-red-100" />
      <span className="flex-grow text-sm font-bold">{down.name} offline</span>
      <span className="text-xs font-extrabold text-red-700">{down.offlineMinutes}m</span>
      <ChevronRight aria-hidden size={16} strokeWidth={2.4} className="text-slate-400" />
    </Link>
  );
}
