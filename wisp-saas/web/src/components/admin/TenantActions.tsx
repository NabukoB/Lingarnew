"use client";

import { CalendarPlus, CreditCard, MessageSquarePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/sonner";
import { adminChange } from "@/lib/admin-actions";

type Kind = "trial" | "subscription" | "sms-credits";

const spec: Record<Kind, { title: string; label: string; unit: string; def: number; min: number; max: number; noteRequired: boolean; done: (n: number) => string }> = {
  trial: { title: "Extend trial", label: "Days", unit: "days", def: 7, min: 1, max: 90, noteRequired: false, done: (n) => `Trial +${n} days` },
  subscription: { title: "Add subscription", label: "Months", unit: "months", def: 1, min: 1, max: 12, noteRequired: false, done: (n) => `+${n} month${n > 1 ? "s" : ""}` },
  "sms-credits": { title: "Grant SMS credits", label: "Credits", unit: "credits", def: 100, min: 1, max: 100000, noteRequired: true, done: (n) => `+${n} credits` },
};

export function TenantActions({ tenantId, paying }: { tenantId: string; paying: boolean }) {
  const router = useRouter();
  const [kind, setKind] = React.useState<Kind | null>(null);
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const s = kind ? spec[kind] : null;

  const open = (k: Kind) => {
    setKind(k);
    setAmount(String(spec[k].def));
    setNote("");
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kind || !s) return;
    const n = Number(amount);
    if (!Number.isInteger(n) || n < s.min || n > s.max) return setError(`Enter ${s.min}–${s.max.toLocaleString("en-KE")} ${s.unit}.`);
    if (s.noteRequired && !note.trim()) return setError("Add a reason.");
    setBusy(true);
    const change = kind === "trial" ? { kind, days: n } : kind === "subscription" ? { kind, months: n } : { kind, credits: n };
    const r = await adminChange(tenantId, change, note.trim());
    setBusy(false);
    if (!r.ok) return setError(r.hint ? `${r.error} ${r.hint}` : r.error);
    toast.success(s.done(n));
    setKind(null);
    router.refresh();
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {!paying && (
          <Button variant="secondary" size="sm" onClick={() => open("trial")}>
            <CalendarPlus aria-hidden size={16} />
            Extend trial
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => open("subscription")}>
          <CreditCard aria-hidden size={16} />
          Add months
        </Button>
        <Button variant="secondary" size="sm" onClick={() => open("sms-credits")}>
          <MessageSquarePlus aria-hidden size={16} />
          SMS credits
        </Button>
      </div>
      <Modal open={kind !== null} onOpenChange={(o) => !o && setKind(null)} title={s?.title ?? ""}>
        {s && (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label={s.label} htmlFor="amount">
              <Input id="amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} className="tabular" />
            </Field>
            <Field label={s.noteRequired ? "Reason" : "Reason (optional)"} htmlFor="note">
              <Input id="note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder={kind === "sms-credits" ? "Refund for failed top-up" : "Paid by bank transfer"} />
            </Field>
            {error && (
              <p role="alert" className="text-sm font-semibold text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" loading={busy}>
              {s.title}
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}
