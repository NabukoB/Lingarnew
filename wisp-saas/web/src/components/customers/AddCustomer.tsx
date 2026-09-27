"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CopyButton } from "../CopyButton";
import { ErrorLine, Field, inputClass, primaryClass } from "../forms/fields";
import { Sheet } from "../Sheet";
import { createSubscriber } from "@/lib/actions";
import { formatKsh, normalizeKenyanPhone } from "@/lib/format";
import type { Plan } from "@/lib/types";

export function AddCustomer({ plans, onClose }: { plans: Plan[]; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [startNow, setStartNow] = useState(true);
  const [error, setError] = useState<{ error: string; hint?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ accountId: string; password: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const msisdn = normalizeKenyanPhone(phone);
    if (!msisdn) return setError({ error: "Enter a phone like 0712 345 678" });
    if (!planId) return setError({ error: "Create a PPPoE package first" });
    setBusy(true);
    const r = await createSubscriber({ full_name: name, phone: msisdn, plan_id: planId, start_now: startNow, physical_address: address });
    setBusy(false);
    if (!r.ok) return setError(r);
    setDone(r.data);
    router.refresh();
  }

  if (done) {
    return (
      <Sheet title="Customer added" onClose={onClose}>
        <div className="flex flex-col items-center gap-2 py-2">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-600">
            <Check aria-hidden size={26} strokeWidth={3} className="text-white" />
          </span>
        </div>
        {[
          ["Username / account", done.accountId],
          ["Password", done.password],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 rounded-2xl bg-white py-2 pl-4 pr-2 shadow-card">
            <span className="text-xs font-bold text-slate-500">{k}</span>
            <span className="tabular ml-auto font-mono text-base font-extrabold">{v}</span>
            <CopyButton text={v!} label={`Copy ${k}`} className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600" />
          </div>
        ))}
        <button type="button" onClick={onClose} className={primaryClass}>
          Done
        </button>
      </Sheet>
    );
  }

  return (
    <Sheet title="Add customer" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <Field label="Name">
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Phone">
          <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" className={inputClass} />
        </Field>
        <Field label="Location">
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Estate, house no." className={inputClass} />
        </Field>
        <Field label="Package">
          <select value={planId} onChange={(e) => setPlanId(e.target.value)} className={inputClass}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {formatKsh(p.priceKes)}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft">
          <input type="checkbox" checked={startNow} onChange={(e) => setStartNow(e.target.checked)} className="h-5 w-5 accent-blue-600" />
          <span className="text-sm font-bold">Paid · start now</span>
        </label>
        <ErrorLine error={error?.error} hint={error?.hint} />
        <button type="submit" disabled={busy} className={primaryClass}>
          {busy ? "…" : "Add customer"}
        </button>
      </form>
    </Sheet>
  );
}
