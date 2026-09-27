"use client";

import clsx from "clsx";
import { Plus, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ErrorLine, Field, inputClass, primaryClass, secondaryClass } from "../forms/fields";
import { Sheet } from "../Sheet";
import { createVouchers } from "@/lib/actions";
import type { Voucher } from "@/lib/api";
import { formatKsh } from "@/lib/format";
import type { Plan } from "@/lib/types";

export function VouchersView({ vouchers, plans, business }: { vouchers: Voucher[]; plans: Plan[]; business: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState(plans.find((p) => !p.isTrial)?.id ?? "");
  const [count, setCount] = useState(20);
  const [batch, setBatch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ error: string; hint?: string } | null>(null);
  const batches = useMemo(() => Array.from(new Set(vouchers.map((v) => v.batch ?? ""))).filter(Boolean), [vouchers]);
  const [shown, setShown] = useState<string>("all");
  const visible = shown === "all" ? vouchers : vouchers.filter((v) => v.batch === shown);
  const unused = visible.filter((v) => !v.redeemed);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await createVouchers(planId, count, batch);
    setBusy(false);
    if (!r.ok) return setError(r);
    setOpen(false);
    if (batch) setShown(batch);
    router.refresh();
  }

  return (
    <>
      <header className="flex flex-wrap items-center gap-3 print:hidden">
        <h1 className="text-2xl font-extrabold tracking-tight">Vouchers</h1>
        <div className="ml-auto flex gap-2.5">
          <button type="button" onClick={() => window.print()} disabled={unused.length === 0} className={secondaryClass + " h-[46px] rounded-full"}>
            <Printer aria-hidden size={16} />
            Print
          </button>
          <button type="button" onClick={() => setOpen(true)} className="flex h-[46px] items-center gap-2 rounded-full bg-blue-600 px-5 text-[13px] font-bold text-white shadow-brand hover:bg-blue-700">
            <Plus aria-hidden size={15} strokeWidth={2.6} />
            New batch
          </button>
        </div>
      </header>

      {batches.length > 0 && (
        <div role="group" aria-label="Batch" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 print:hidden lg:mx-0 lg:px-0">
          {["all", ...batches].map((b) => (
            <button
              key={b}
              type="button"
              aria-pressed={shown === b}
              onClick={() => setShown(b)}
              className={clsx("h-[38px] shrink-0 rounded-full px-4 text-[13px]", shown === b ? "bg-blue-600 font-bold text-white" : "bg-white font-semibold text-slate-700 shadow-soft")}
            >
              {b === "all" ? "All" : b}
            </button>
          ))}
        </div>
      )}

      <section aria-label="Voucher codes" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 print:grid-cols-4 print:gap-2">
        {visible.map((v) => (
          <div
            key={v.id}
            className={clsx(
              "flex flex-col gap-1 rounded-tile bg-white p-4 shadow-card print:rounded-lg print:border print:border-slate-300 print:shadow-none",
              v.redeemed && "opacity-40 print:hidden",
            )}
          >
            <span className="hidden text-[10px] font-bold text-slate-500 print:block">{business}</span>
            <span className="font-mono text-lg font-extrabold tracking-[0.18em]">{v.code}</span>
            <span className="text-xs font-bold text-slate-500">
              {v.plan}
              {v.redeemed ? " · used" : ""}
            </span>
          </div>
        ))}
      </section>
      {vouchers.length === 0 && <p className="py-12 text-center text-sm font-semibold text-slate-500">No vouchers yet</p>}

      {open && (
        <Sheet title="New batch" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="flex flex-col gap-3.5">
            <Field label="Package">
              <select value={planId} onChange={(e) => setPlanId(e.target.value)} className={inputClass}>
                {plans.filter((p) => !p.isTrial).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {formatKsh(p.priceKes)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="How many">
                <input type="number" min={1} max={500} value={count} onChange={(e) => setCount(Number(e.target.value))} className={inputClass} />
              </Field>
              <Field label="Label">
                <input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="Shop A" className={inputClass} />
              </Field>
            </div>
            <ErrorLine error={error?.error} hint={error?.hint} />
            <button type="submit" disabled={busy || !planId} className={primaryClass}>
              {busy ? "…" : "Create"}
            </button>
          </form>
        </Sheet>
      )}
    </>
  );
}
