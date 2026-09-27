"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { RouterStatusDot, RouterStatusPill } from "@/components/bits";
import { m, Stagger, StaggerItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { RouterRow } from "@/lib/types";

export function RoutersRing({ online, total, size = 76 }: { online: number; total: number; size?: number }) {
  const c = 2 * Math.PI * 40;
  const off = total === 0 ? c : c * (1 - online / total);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 96 96" role="img" aria-label={`${online} of ${total} routers online`} className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx="48" cy="48" r="40" fill="none" stroke={total ? "#fee2e2" : "#e2e8f0"} strokeWidth={11} />
        <m.circle
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke="#16a34a"
          strokeWidth={11}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: off }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="tabular absolute inset-0 flex items-center justify-center text-lg font-extrabold">
        {online}/{total}
      </span>
    </div>
  );
}

export function NetworkCard({ routers }: { routers: RouterRow[] }) {
  const online = routers.filter((r) => r.status !== "offline" && r.status !== "pending").length;
  const users = routers.reduce((n, r) => n + (r.users ?? 0), 0);
  return (
    <Card aria-label="Network" className="flex flex-col gap-1.5 px-[22px] pb-3.5 pt-[22px]">
      <div className="flex items-center gap-4 pb-2">
        <RoutersRing online={online} total={routers.length} />
        <div className="flex flex-col gap-0.5">
          <Link href="/network" className="text-base font-extrabold hover:text-primary">
            Network
          </Link>
          <span className="text-[13px] font-semibold text-muted-foreground">{users} users online</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild size="icon" variant="ghost" className="ml-auto h-10 w-10 bg-accent text-primary">
              <Link href="/routers/new" aria-label="Add router">
                <Plus aria-hidden size={18} strokeWidth={2.6} />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add router</TooltipContent>
        </Tooltip>
      </div>
      <Stagger as="ul">
        {routers.slice(0, 7).map((r) => (
          <StaggerItem as="li" key={r.id}>
            <Link href={`/routers/${r.id}`} className="-mx-2 flex items-center gap-3 rounded-xl border-t border-line px-2 py-2.5 transition-colors hover:bg-muted/60">
              <RouterStatusDot status={r.status} />
              <span className="min-w-0 flex-grow truncate text-sm font-bold">{r.name}</span>
              <span className="tabular text-xs font-semibold text-muted-foreground">{r.users ?? "—"}</span>
              <RouterStatusPill status={r.status} />
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
      {routers.length === 0 && (
        <Link href="/routers/new" className="py-6 text-center text-[13px] font-bold text-primary">
          Add your first router
        </Link>
      )}
    </Card>
  );
}
