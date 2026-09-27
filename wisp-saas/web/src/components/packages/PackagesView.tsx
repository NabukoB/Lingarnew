"use client";

import { Clock, Gauge, Package, Plus, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/bits";
import { m, Stagger, StaggerItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { SwitchRow } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { savePlan, type PlanForm } from "@/lib/actions";
import { formatKsh } from "@/lib/format";
import { durationLabel, speedLabel } from "@/lib/mappers";
import type { Plan } from "@/lib/types";

type Kind = "pppoe" | "hotspot";

const DURATIONS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hr", minutes: 60 },
  { label: "3 hrs", minutes: 180 },
  { label: "1 day", minutes: 1440 },
  { label: "1 week", minutes: 10080 },
  { label: "30 days", minutes: 43200 },
];

function blank(kind: Kind): PlanForm {
  return {
    name: "",
    access_type: kind,
    price_kes: kind === "pppoe" ? 1500 : 20,
    duration_days: kind === "pppoe" ? 30 : null,
    duration_minutes: kind === "hotspot" ? 60 : null,
    is_trial: false,
    data_cap_mb: null,
    bandwidth_down_kbps: 5000,
    bandwidth_up_kbps: kind === "pppoe" ? 2000 : 5000,
    max_devices: 1,
    is_active: true,
  };
}

function fromPlan(p: Plan): PlanForm {
  return {
    name: p.name,
    access_type: p.accessType,
    price_kes: p.priceKes,
    duration_days: p.durationDays,
    duration_minutes: p.durationMinutes,
    is_trial: p.isTrial,
    data_cap_mb: p.dataCapMb,
    bandwidth_down_kbps: p.downKbps,
    bandwidth_up_kbps: p.upKbps,
    max_devices: p.maxDevices,
    is_active: p.isActive,
  };
}

const num = (v: string) => (v === "" ? 0 : Number(v));

function PlanEditor({ id, initial, open, onOpenChange }: { id: string | null; initial: PlanForm; open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof PlanForm>(k: K, v: PlanForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const hotspot = f.access_type === "hotspot";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await savePlan(id, { ...f, price_kes: f.is_trial ? 0 : f.price_kes });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    toast.success(id ? "Package saved" : "Package created");
    router.refresh();
    onOpenChange(false);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={id ? "Edit package" : "New package"}>
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <Field label="Name" htmlFor="p-name">
          <Input id="p-name" required value={f.name} onChange={(e) => set("name", e.target.value)} placeholder={hotspot ? "1 day" : "Bronze 5 Mbps"} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (KSh)" htmlFor="p-price">
            <Input id="p-price" type="number" inputMode="numeric" min={0} required disabled={f.is_trial} value={f.is_trial ? 0 : f.price_kes} onChange={(e) => set("price_kes", num(e.target.value))} />
          </Field>
          {hotspot ? (
            <Field label="Time">
              <Select value={String(f.duration_minutes ?? 60)} onValueChange={(v) => set("duration_minutes", num(v))}>
                <SelectTrigger aria-label="Time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d.minutes} value={String(d.minutes)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <Field label="Days" htmlFor="p-days">
              <Input id="p-days" type="number" inputMode="numeric" min={1} value={f.duration_days ?? 30} onChange={(e) => set("duration_days", num(e.target.value))} />
            </Field>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Down (Mbps)" htmlFor="p-down">
            <Input id="p-down" type="number" inputMode="decimal" min={0.1} step={0.1} value={f.bandwidth_down_kbps / 1000} onChange={(e) => set("bandwidth_down_kbps", Math.round(num(e.target.value) * 1000))} />
          </Field>
          <Field label="Up (Mbps)" htmlFor="p-up">
            <Input id="p-up" type="number" inputMode="decimal" min={0.1} step={0.1} value={f.bandwidth_up_kbps / 1000} onChange={(e) => set("bandwidth_up_kbps", Math.round(num(e.target.value) * 1000))} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data cap (GB)" htmlFor="p-cap">
            <Input
              id="p-cap"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Unlimited"
              value={f.data_cap_mb ? f.data_cap_mb / 1000 : ""}
              onChange={(e) => set("data_cap_mb", e.target.value ? Math.round(num(e.target.value) * 1000) : null)}
            />
          </Field>
          {hotspot && (
            <Field label="Devices" htmlFor="p-dev">
              <Input id="p-dev" type="number" inputMode="numeric" min={1} max={10} value={f.max_devices} onChange={(e) => set("max_devices", num(e.target.value))} />
            </Field>
          )}
        </div>
        {hotspot && <SwitchRow id="p-trial" label="Free trial" checked={f.is_trial} onCheckedChange={(v) => set("is_trial", v)} />}
        <SwitchRow id="p-active" label="On sale" checked={f.is_active} onCheckedChange={(v) => set("is_active", v)} />
        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 px-4 py-2.5 text-[13px] font-bold text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" loading={busy}>
          Save
        </Button>
      </form>
    </Modal>
  );
}

export function PackagesView({ kind, plans }: { kind: Kind; plans: Plan[] }) {
  const [editing, setEditing] = useState<{ id: string | null; form: PlanForm; n: number } | null>(null);
  const [open, setOpen] = useState(false);
  const edit = (id: string | null, form: PlanForm) => {
    setEditing((e) => ({ id, form, n: (e?.n ?? 0) + 1 }));
    setOpen(true);
  };
  return (
    <>
      <PageHeader
        title="Packages"
        actions={
          <Button size="pill" onClick={() => edit(null, blank(kind))}>
            <Plus aria-hidden size={15} strokeWidth={2.6} />
            New
          </Button>
        }
      >
        <Segmented
          id="package-kind"
          label="Type"
          value={kind}
          items={[
            { value: "pppoe", label: "PPPoE", href: "/packages" },
            { value: "hotspot", label: "Hotspot", href: "/packages/hotspot" },
          ]}
        />
      </PageHeader>

      {plans.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No packages yet"
          action={
            <Button size="sm" onClick={() => edit(null, blank(kind))}>
              New package
            </Button>
          }
        />
      ) : (
        <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {plans.map((p) => (
            <StaggerItem key={p.id}>
              <m.button
                type="button"
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => edit(p.id, fromPlan(p))}
                className={cn("flex h-full w-full flex-col items-start gap-1.5 rounded-tile bg-card p-4 text-left shadow-card transition-shadow hover:shadow-float", !p.isActive && "opacity-55")}
              >
                <span className="flex w-full items-center gap-2">
                  <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-accent text-primary">
                    {kind === "hotspot" ? <Clock aria-hidden size={16} /> : <Gauge aria-hidden size={16} />}
                  </span>
                  {p.isTrial && (
                    <Badge variant="success" className="ml-auto">
                      Trial
                    </Badge>
                  )}
                  {!p.isActive && (
                    <Badge variant="muted" className="ml-auto">
                      Off
                    </Badge>
                  )}
                </span>
                <span className="text-lg font-extrabold tracking-tight">{p.name}</span>
                <span className="text-xs font-bold text-muted-foreground">
                  {speedLabel(p.downKbps)}
                  {kind === "hotspot" && p.durationMinutes ? ` · ${durationLabel(p.durationMinutes)}` : ""}
                  {kind === "pppoe" && p.durationDays ? ` · ${p.durationDays} days` : ""}
                </span>
                <span className="mt-1 flex w-full items-center">
                  <span className="text-base font-extrabold">{p.isTrial ? "Free" : formatKsh(p.priceKes)}</span>
                  {kind === "hotspot" && p.maxDevices > 1 && (
                    <span className="ml-auto flex items-center gap-1 text-xs font-bold text-muted-foreground">
                      <Smartphone aria-hidden size={13} />
                      {p.maxDevices}
                    </span>
                  )}
                </span>
              </m.button>
            </StaggerItem>
          ))}
        </Stagger>
      )}
      {editing && <PlanEditor key={editing.n} id={editing.id} initial={editing.form} open={open} onOpenChange={setOpen} />}
    </>
  );
}
