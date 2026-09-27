"use client";

import { Eye, EyeOff, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { initialsOf, SubscriberStatusPill } from "@/components/bits";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { changePlan, revealPassword, sendSTK, setSubscriberStatus, transactionStatus } from "@/lib/actions";
import { formatKsh } from "@/lib/format";
import type { Plan, Subscriber } from "@/lib/types";

export function CustomerDetail({ subscriber: s, plans, paybill }: { subscriber: Subscriber; plans: Plan[]; paybill: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [tx, setTx] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const key = s.key;

  // Follow an STK push until the customer answers the prompt.
  useEffect(() => {
    if (!tx) return;
    const t = setInterval(async () => {
      const r = await transactionStatus(tx);
      if (!r.ok || r.data.status === "pending") return;
      setTx(null);
      if (r.data.status === "success") toast.success(r.data.message);
      else toast.error(r.data.message);
      router.refresh();
    }, 3000);
    return () => clearInterval(t);
  }, [tx, router]);

  async function run<T>(name: string, fn: () => Promise<{ ok: true; data: T } | { ok: false; error: string; hint?: string }>, success?: string): Promise<T | null> {
    if (!key) {
      toast.error("Example data: connect the API first.");
      return null;
    }
    setBusy(name);
    const r = await fn();
    setBusy(null);
    if (!r.ok) {
      toast.error(r.error, { description: r.hint });
      return null;
    }
    if (success) toast.success(success);
    router.refresh();
    return r.data;
  }

  const blocked = s.status === "suspended" || s.status === "cancelled";
  const facts: [string, string][] = [
    ["Plan", s.plan],
    ["Price", s.price ? formatKsh(s.price) + "/mo" : "—"],
    ["Paid until", s.paidUntil ?? "—"],
    ["Status", s.online],
  ];

  return (
    <>
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="text-base">{initialsOf(s.name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <h2 className="truncate text-lg font-extrabold tracking-tight">{s.name}</h2>
          <span className="text-[13px] font-bold text-primary">{s.id}</span>
        </div>
        <span className="ml-auto">
          <SubscriberStatusPill status={s.status} />
        </span>
      </div>
      <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground hover:text-primary">
        <Smartphone aria-hidden className="h-4 w-4" />
        {s.phone}
      </a>
      <dl className="grid grid-cols-2 gap-2.5">
        {facts.map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-muted/60 px-3 py-2.5">
            <dt className="text-[11px] text-muted-foreground">{k}</dt>
            <dd className="mt-0.5 truncate text-sm font-bold">{v}</dd>
          </div>
        ))}
      </dl>
      {paybill && (
        <div className="flex items-center justify-between rounded-2xl bg-accent px-3.5 py-3 text-sm">
          <span className="font-bold text-accent-foreground">Paybill {paybill}</span>
          <b>{s.id}</b>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Button
          size="lg"
          loading={busy === "stk" || !!tx}
          disabled={s.status === "cancelled"}
          onClick={async () => {
            const r = await run("stk", () => sendSTK(key!));
            if (r) {
              setTx(r.transactionId);
              toast(r.message);
            }
          }}
        >
          {tx ? "Waiting for PIN…" : "Send STK push"}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Select value={s.planId ?? undefined} onValueChange={(v) => v !== s.planId && void run("plan", () => changePlan(key!, v), "Plan changed")}>
            <SelectTrigger aria-label="Change plan" className="h-11 rounded-[14px] text-[13px] font-bold shadow-none ring-1 ring-border">
              <SelectValue placeholder="Change plan" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} · {formatKsh(p.priceKes)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="h-11 rounded-[14px] text-[13px]"
            loading={busy === "pw"}
            onClick={async () => {
              if (password) return setPassword(null);
              const r = await run("pw", () => revealPassword(key!));
              if (r) setPassword(r);
            }}
          >
            {password ? (
              <>
                <EyeOff aria-hidden className="h-4 w-4" />
                <span className="font-mono">{password}</span>
              </>
            ) : (
              <>
                <Eye aria-hidden className="h-4 w-4" />
                Password
              </>
            )}
          </Button>
        </div>
        {blocked ? (
          <Button variant="success" className="h-11 rounded-[14px] text-[13px]" loading={busy === "status"} onClick={() => run("status", () => setSubscriberStatus(key!, "reactivate"), "Reactivated")}>
            Reactivate
          </Button>
        ) : (
          <Button variant="destructive" className="h-11 rounded-[14px] text-[13px]" onClick={() => setConfirming(true)}>
            Suspend
          </Button>
        )}
      </div>

      <Modal open={confirming} onOpenChange={setConfirming} title={`Suspend ${s.name}?`} description="They go offline now.">
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" size="lg" onClick={() => setConfirming(false)}>
            Keep
          </Button>
          <Button
            size="lg"
            className="bg-destructive shadow-none hover:bg-destructive/90"
            loading={busy === "status"}
            onClick={async () => {
              await run("status", () => setSubscriberStatus(key!, "suspend"), "Suspended");
              setConfirming(false);
            }}
          >
            Suspend
          </Button>
        </div>
      </Modal>
    </>
  );
}
