"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { m } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { SwitchRow } from "@/components/ui/switch";
import { createSubscriber } from "@/lib/actions";
import { formatKsh, normalizeKenyanPhone } from "@/lib/format";
import type { Plan } from "@/lib/types";

export function AddCustomer({ plans, open, onOpenChange }: { plans: Plan[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [startNow, setStartNow] = useState(true);
  const [errors, setErrors] = useState<{ phone?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ accountId: string; password: string } | null>(null);

  useEffect(() => {
    if (!open) {
      setDone(null);
      setErrors({});
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const msisdn = normalizeKenyanPhone(phone);
    if (!msisdn) return setErrors({ phone: "Use a number like 0712 345 678" });
    if (!planId) return setErrors({ form: "Create a PPPoE package first" });
    setBusy(true);
    const r = await createSubscriber({ full_name: name, phone: msisdn, plan_id: planId, start_now: startNow, physical_address: address });
    setBusy(false);
    if (!r.ok) return setErrors({ form: r.error });
    setDone(r.data);
    setName("");
    setPhone("");
    setAddress("");
    toast.success(`${r.data.accountId} added`);
    router.refresh();
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={done ? "Customer added" : "Add customer"}>
      {done ? (
        <div className="flex flex-col gap-3">
          <m.span
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 16 }}
            className="mx-auto my-2 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 shadow-[0_8px_18px_rgba(22,163,74,0.3)]"
          >
            <Check aria-hidden size={26} strokeWidth={3} className="text-white" />
          </m.span>
          {[
            ["Username", done.accountId],
            ["Password", done.password],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 rounded-2xl bg-card py-2 pl-4 pr-2 shadow-card">
              <span className="text-xs font-bold text-muted-foreground">{k}</span>
              <span className="tabular ml-auto font-mono text-base font-extrabold">{v}</span>
              <CopyButton text={v!} label={`Copy ${k}`} className="h-10 w-10 rounded-xl bg-accent text-primary" />
            </div>
          ))}
          <Button size="lg" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <Field label="Name" htmlFor="c-name">
            <Input id="c-name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Phone" htmlFor="c-phone" error={errors.phone}>
            <Input
              id="c-phone"
              required
              type="tel"
              inputMode="tel"
              value={phone}
              aria-invalid={errors.phone ? true : undefined}
              onChange={(e) => {
                setPhone(e.target.value);
                setErrors({});
              }}
              placeholder="0712 345 678"
            />
          </Field>
          <Field label="Location" htmlFor="c-addr">
            <Input id="c-addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Estate, house no." />
          </Field>
          <Field label="Package">
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger aria-label="Package">
                <SelectValue placeholder="Choose package" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {formatKsh(p.priceKes)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <SwitchRow id="c-start" label="Paid · start now" checked={startNow} onCheckedChange={setStartNow} />
          {errors.form && (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-2.5 text-[13px] font-bold text-red-700">
              {errors.form}
            </p>
          )}
          <Button type="submit" size="lg" loading={busy}>
            Add customer
          </Button>
        </form>
      )}
    </Modal>
  );
}
