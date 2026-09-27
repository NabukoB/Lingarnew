"use client";

import { Plus, Printer, Ticket } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, PageHeader } from "@/components/bits";
import { Stagger, StaggerItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { createVouchers } from "@/lib/actions";
import type { Voucher } from "@/lib/api";
import { formatKsh } from "@/lib/format";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

export function VouchersView({ vouchers, plans, business }: { vouchers: Voucher[]; plans: Plan[]; business: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const sellable = plans.filter((p) => !p.isTrial);
  const [open, setOpen] = useState(params.get("new") === "1");
  const [planId, setPlanId] = useState(sellable[0]?.id ?? "");
  const [count, setCount] = useState(20);
  const [batch, setBatch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const batches = useMemo(() => Array.from(new Set(vouchers.map((v) => v.batch ?? ""))).filter(Boolean).slice(0, 12), [vouchers]);
  const [shown, setShown] = useState<string>("all");
  const visible = shown === "all" ? vouchers : vouchers.filter((v) => v.batch === shown);
  const unused = visible.filter((v) => !v.redeemed);

  useEffect(() => {
    if (params.get("new") === "1") setOpen(true);
  }, [params]);

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o && params.get("new")) router.replace(pathname, { scroll: false });
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await createVouchers(planId, count, batch);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    onOpenChange(false);
    toast.success(`${r.data.length} vouchers created`);
    if (batch) setShown(batch);
    router.refresh();
  }

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="Vouchers"
          actions={
            <>
              <Button variant="secondary" size="pill" onClick={() => window.print()} disabled={unused.length === 0}>
                <Printer aria-hidden size={16} />
                Print
              </Button>
              <Button size="pill" onClick={() => onOpenChange(true)}>
                <Plus aria-hidden size={15} strokeWidth={2.6} />
                New batch
              </Button>
            </>
          }
        />
      </div>

      {batches.length > 0 && (
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4 print:hidden lg:mx-0 lg:px-0">
          <Segmented id="voucher-batch" label="Batch" className="w-max" value={shown} onValueChange={setShown} items={["all", ...batches].map((b) => ({ value: b, label: b === "all" ? "All" : b }))} />
        </div>
      )}

      {vouchers.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No vouchers yet"
          action={
            <Button size="sm" onClick={() => onOpenChange(true)}>
              New batch
            </Button>
          }
        />
      ) : (
        <Stagger key={shown} as="section" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 print:grid-cols-4 print:gap-2">
          {visible.map((v) => (
            <StaggerItem
              key={v.id}
              aria-label={`Voucher ${v.code}`}
              className={cn(
                "flex flex-col gap-1 rounded-tile bg-card p-4 shadow-card print:rounded-lg print:border print:border-slate-300 print:shadow-none",
                v.redeemed && "opacity-40 print:hidden",
              )}
            >
              <span className="hidden text-[10px] font-bold text-muted-foreground print:block">{business}</span>
              <span data-code className="font-mono text-lg font-extrabold tracking-[0.18em]">
                {v.code}
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                {v.plan}
                {v.redeemed ? " · used" : ""}
              </span>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <Modal open={open} onOpenChange={onOpenChange} title="New batch">
        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <Field label="Package">
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger aria-label="Package">
                <SelectValue placeholder="Choose package" />
              </SelectTrigger>
              <SelectContent>
                {sellable.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {formatKsh(p.priceKes)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="How many" htmlFor="v-count">
              <Input id="v-count" type="number" inputMode="numeric" min={1} max={500} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </Field>
            <Field label="Label" htmlFor="v-batch">
              <Input id="v-batch" value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="Shop A" />
            </Field>
          </div>
          {error && (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-2.5 text-[13px] font-bold text-red-700">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" loading={busy} disabled={!planId}>
            Create
          </Button>
        </form>
      </Modal>
    </>
  );
}
