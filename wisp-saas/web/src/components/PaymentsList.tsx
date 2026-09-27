"use client";

import { AlertCircle, Home, Wifi } from "lucide-react";
import { IconBox } from "@/components/bits";
import { MatchPayment } from "@/components/MatchPayment";
import { Stagger, StaggerItem } from "@/components/motion";
import type { Payment } from "@/lib/types";
import { cn } from "@/lib/utils";

const kinds = {
  hotspot: { icon: Wifi, tone: "green" as const },
  pppoe: { icon: Home, tone: "blue" as const },
  unmatched: { icon: AlertCircle, tone: "amber" as const },
};

export function PaymentsList({ payments, columns = 2 }: { payments: Payment[]; columns?: 1 | 2 }) {
  return (
    <section aria-label="Latest payments" className="rounded-card bg-card px-5 py-2 shadow-card lg:px-6">
      {payments.length === 0 && <p className="py-8 text-center text-sm font-semibold text-muted-foreground">No payments yet</p>}
      <Stagger className={cn(columns === 2 && "lg:grid lg:grid-cols-2 lg:gap-x-8")}>
        {payments.map((p, i) => {
          const k = kinds[p.kind];
          return (
            <StaggerItem key={p.id} className={cn("flex items-center gap-3 py-3", i > 0 && "border-t border-line", columns === 2 && i === 1 && "lg:border-t-0")}>
              <IconBox icon={k.icon} tone={k.tone} />
              <div className="flex min-w-0 flex-grow flex-col">
                <span className="truncate text-sm font-bold">{p.who}</span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {p.time}
                  {p.kind === "unmatched" ? "" : ` · ${p.detail}`}
                </span>
              </div>
              {p.kind === "unmatched" && p.reference !== undefined && <MatchPayment id={p.id} />}
              <span className={cn("tabular text-sm font-extrabold", p.kind === "unmatched" ? "text-amber-700" : "text-green-700")}>
                {p.kind === "unmatched" ? "" : "+"}
                {p.amount.toLocaleString("en-KE")}
              </span>
            </StaggerItem>
          );
        })}
      </Stagger>
    </section>
  );
}
