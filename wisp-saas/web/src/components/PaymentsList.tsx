import { AlertCircle, Home, Wifi } from "lucide-react";
import clsx from "clsx";
import type { Payment } from "@/lib/types";
import { IconBox } from "./ui";

const kinds = {
  hotspot: { icon: Wifi, tone: "green" as const },
  pppoe: { icon: Home, tone: "blue" as const },
  unmatched: { icon: AlertCircle, tone: "amber" as const },
};

export function PaymentsList({ payments, columns = 2 }: { payments: Payment[]; columns?: 1 | 2 }) {
  return (
    <section
      aria-label="Latest payments"
      className={clsx(
        "rounded-card bg-white px-5 py-2 shadow-card lg:px-6",
        columns === 2 && "lg:grid lg:grid-cols-2 lg:gap-x-8",
      )}
    >
      {payments.map((p, i) => {
        const k = kinds[p.kind];
        return (
          <div
            key={p.id}
            className={clsx(
              "flex items-center gap-3 py-3",
              i > 0 && "border-t border-line",
              columns === 2 && i === 1 && "lg:border-t-0",
            )}
          >
            <IconBox icon={k.icon} tone={k.tone} />
            <div className="flex min-w-0 flex-grow flex-col">
              <span className="truncate text-sm font-bold">{p.who}</span>
              <span className="text-xs font-semibold text-slate-500">
                {p.time} · {p.detail}
              </span>
            </div>
            <span className={clsx("tabular text-sm font-extrabold", p.kind === "unmatched" ? "text-amber-700" : "text-green-700")}>
              {p.kind === "unmatched" ? "" : "+"}
              {p.amount.toLocaleString("en-KE")}
            </span>
          </div>
        );
      })}
    </section>
  );
}
