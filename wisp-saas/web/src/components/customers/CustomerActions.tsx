"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { changePlan, revealPassword, sendSTK, setSubscriberStatus, transactionStatus } from "@/lib/actions";
import { formatKsh } from "@/lib/format";
import type { Plan, Subscriber } from "@/lib/types";

const outline = "h-11 rounded-[14px] border border-slate-200 text-[13px] font-semibold text-slate-700 disabled:opacity-40";

export function CustomerActions({ subscriber: s, plans }: { subscriber: Subscriber; plans: Plan[] }) {
  const router = useRouter();
  const [note, setNote] = useState<{ tone: "ok" | "err" | "wait"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const key = s.key;

  // Follow an STK push until the customer answers the prompt.
  useEffect(() => {
    if (!tx) return;
    const t = setInterval(async () => {
      const r = await transactionStatus(tx);
      if (!r.ok || r.data.status === "pending") return;
      setTx(null);
      setNote({ tone: r.data.status === "success" ? "ok" : "err", text: r.data.message });
      router.refresh();
    }, 3000);
    return () => clearInterval(t);
  }, [tx, router]);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) {
    if (!key) return setNote({ tone: "err", text: "Example data: connect the API first." });
    setBusy(true);
    setNote(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) setNote({ tone: "err", text: r.error ?? "Failed" });
    else {
      if (success) setNote({ tone: "ok", text: success });
      router.refresh();
    }
  }

  const blocked = s.status === "suspended" || s.status === "cancelled";
  return (
    <div className="flex flex-col gap-2">
      {note && (
        <div
          role="status"
          className={
            note.tone === "err"
              ? "rounded-2xl bg-red-50 px-3.5 py-2.5 text-[13px] font-bold text-red-700"
              : note.tone === "ok"
                ? "rounded-2xl bg-green-50 px-3.5 py-2.5 text-[13px] font-bold text-green-700"
                : "rounded-2xl bg-blue-50 px-3.5 py-2.5 text-[13px] font-bold text-blue-700"
          }
        >
          {note.text}
        </div>
      )}
      <button
        type="button"
        disabled={busy || !!tx || s.status === "cancelled"}
        onClick={() =>
          run(async () => {
            const r = await sendSTK(key!);
            if (r.ok) {
              setTx(r.data.transactionId);
              setNote({ tone: "wait", text: r.data.message });
            }
            return r;
          })
        }
        className="h-12 rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-brand hover:bg-blue-700 disabled:opacity-60"
      >
        {tx ? "Waiting for PIN…" : "Send STK push"}
      </button>
      {picking ? (
        <select
          autoFocus
          defaultValue={s.planId ?? ""}
          onChange={(e) => {
            setPicking(false);
            if (e.target.value && e.target.value !== s.planId) void run(() => changePlan(key!, e.target.value), "Plan changed");
          }}
          onBlur={() => setPicking(false)}
          className="h-11 rounded-[14px] bg-white px-3 text-[13px] font-semibold shadow-soft"
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {formatKsh(p.priceKes)}
            </option>
          ))}
        </select>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => setPicking(true)} className={outline}>
            Change plan
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              password
                ? setPassword(null)
                : run(async () => {
                    const r = await revealPassword(key!);
                    if (r.ok) setPassword(r.data);
                    return r;
                  })
            }
            className={outline}
          >
            {password ? <span className="font-mono font-bold">{password}</span> : "Show password"}
          </button>
        </div>
      )}
      {blocked ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => setSubscriberStatus(key!, "reactivate"), "Reactivated")}
          className="h-11 rounded-[14px] border border-green-200 text-[13px] font-bold text-green-700 disabled:opacity-40"
        >
          Reactivate
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (confirm(`Suspend ${s.name}? They go offline now.`)) void run(() => setSubscriberStatus(key!, "suspend"), "Suspended");
          }}
          className="h-11 rounded-[14px] border border-red-200 text-[13px] font-bold text-red-700 disabled:opacity-40"
        >
          Suspend
        </button>
      )}
    </div>
  );
}
