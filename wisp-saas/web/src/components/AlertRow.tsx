"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { RouterStatusDot } from "@/components/bits";
import { m } from "@/components/motion";
import type { RouterRow } from "@/lib/types";

export function AlertRow({ routers }: { routers: RouterRow[] }) {
  const down = routers.find((r) => r.status === "offline");
  if (!down) return null;
  return (
    <m.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
      <Link href={`/routers/${down.id}`} className="group flex h-[60px] items-center gap-3 rounded-tile bg-card px-[18px] shadow-card transition-shadow hover:shadow-float">
        <span className="ml-1">
          <RouterStatusDot status="offline" />
        </span>
        <span className="flex-grow text-sm font-bold">{down.name} offline</span>
        {down.offlineMinutes ? <span className="text-xs font-extrabold text-red-700">{down.offlineMinutes}m</span> : null}
        <ChevronRight aria-hidden size={16} strokeWidth={2.4} className="text-slate-400 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </m.div>
  );
}
