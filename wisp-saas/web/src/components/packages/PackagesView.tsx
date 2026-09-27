"use client";

import clsx from "clsx";
import { Clock, Gauge, Plus, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorLine, Field, inputClass, primaryClass } from "../forms/fields";
import { Sheet } from "../Sheet";
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

function PlanEditor({ id, initial, onClose }: { id: string | null; initial: PlanForm; onClose: () => void }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [error, setError] = useState<{ error: string; hint?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof PlanForm>(k: K, v: PlanForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const hotspot = f.access_type === "hotspot";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await savePlan(id, { ...f, price_kes: f.is_trial ? 0 : f.price_kes });
    setBusy(false);
    if (!r.ok) return setError(r);
    router.refresh();
    onClose();
  }

  return (
    <Sheet title={id ? "Edit package" : "New package"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <Field label="Name">
          <input required value={f.name} onChange={(e) => set("name", e.target.value)} placeholder={hotspot ? "1 day" : "Bronze 5 Mbps"} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (KSh)">
            <input type="number" min={0} required disabled={f.is_trial} value={f.is_trial ? 0 : f.price_kes} onChange={(e) => set("price_kes", num(e.target.value))} className={inputClass} />
          </Field>
          {hotspot ? (
            <Field label="Time">
              <select value={f.duration_minutes ?? 60} onChange={(e) => set("duration_minutes", num(e.target.value))} className={inputClass}>
                {DURATIONS.map((d) => (
                  <option key={d.minutes} value={d.minutes}>
                    {d.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Days">
              <input type="number" min={1} value={f.duration_days ?? 30} onChange={(e) => set("duration_days", num(e.target.value))} className={inputClass} />
            </Field>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Download (Mbps)">
            <input type="number" min={0.1} step={0.1} value={f.bandwidth_down_kbps / 1000} onChange={(e) => set("bandwidth_down_kbps", Math.round(num(e.target.value) * 1000))} className={inputClass} />
          </Field>
          <Field label="Upload (Mbps)">
            <input type="number" min={0.1} step={0.1} value={f.bandwidth_up_kbps / 1000} onChange={(e) => set("bandwidth_up_kbps", Math.round(num(e.target.value) * 1000))} className={inputClass} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data cap (GB)">
            <input
              type="number"
              min={0}
              placeholder="Unlimited"
              value={f.data_cap_mb ? f.data_cap_mb / 1000 : ""}
              onChange={(e) => set("data_cap_mb", e.target.value ? Math.round(num(e.target.value) * 1000) : null)}
              className={inputClass}
            />
          </Field>
          {hotspot && (
            <Field label="Devices">
              <input type="number" min={1} max={10} value={f.max_devices} onChange={(e) => set("max_devices", num(e.target.value))} className={inputClass} />
            </Field>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {hotspot && (
            <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft">
              <input type="checkbox" checked={f.is_trial} onChange={(e) => set("is_trial", e.target.checked)} className="h-5 w-5 accent-blue-600" />
              <span className="text-sm font-bold">Free trial</span>
            </label>
          )}
          <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft">
            <input type="checkbox" checked={f.is_active} onChange={(e) => set("is_active", e.target.checked)} className="h-5 w-5 accent-blue-600" />
            <span className="text-sm font-bold">On sale</span>
          </label>
        </div>
        <ErrorLine error={error?.error} hint={error?.hint} />
        <button type="submit" disabled={busy} className={primaryClass}>
          {busy ? "…" : "Save"}
        </button>
      </form>
    </Sheet>
  );
}

export function PackagesView({ kind, plans }: { kind: Kind; plans: Plan[] }) {
  const [editing, setEditing] = useState<{ id: string | null; form: PlanForm } | null>(null);
  return (
    <>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Packages</h1>
        <div role="group" aria-label="Type" className="flex rounded-xl bg-white p-[3px] shadow-soft">
          {(["pppoe", "hotspot"] as const).map((k) => (
            <Link
              key={k}
              href={k === "pppoe" ? "/packages" : "/packages/hotspot"}
              aria-current={k === kind ? "page" : undefined}
              className={clsx("h-9 rounded-[10px] px-3.5 text-[13px] font-bold leading-9", k === kind ? "bg-blue-600 text-white" : "text-slate-500")}
            >
              {k === "pppoe" ? "PPPoE" : "Hotspot"}
            </Link>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setEditing({ id: null, form: blank(kind) })}
          className="ml-auto flex h-[46px] items-center gap-2 rounded-full bg-blue-600 px-5 text-[13px] font-bold text-white shadow-brand hover:bg-blue-700"
        >
          <Plus aria-hidden size={15} strokeWidth={2.6} />
          New
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {plans.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setEditing({ id: p.id, form: fromPlan(p) })}
            className={clsx("flex flex-col items-start gap-1.5 rounded-tile bg-white p-4 text-left shadow-card transition hover:shadow-float", !p.isActive && "opacity-50")}
          >
            <span className="flex w-full items-center gap-2">
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-blue-50 text-blue-600">
                {kind === "hotspot" ? <Clock aria-hidden size={16} /> : <Gauge aria-hidden size={16} />}
              </span>
              {p.isTrial && <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-extrabold text-green-700">Trial</span>}
              {!p.isActive && <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-extrabold text-slate-500">Off</span>}
            </span>
            <span className="text-lg font-extrabold tracking-tight">{p.name}</span>
            <span className="text-xs font-bold text-slate-500">
              {speedLabel(p.downKbps)}
              {kind === "hotspot" && p.durationMinutes ? ` · ${durationLabel(p.durationMinutes)}` : ""}
              {kind === "pppoe" && p.durationDays ? ` · ${p.durationDays} days` : ""}
            </span>
            <span className="mt-1 flex w-full items-center">
              <span className="text-base font-extrabold">{p.isTrial ? "Free" : formatKsh(p.priceKes)}</span>
              {kind === "hotspot" && p.maxDevices > 1 && (
                <span className="ml-auto flex items-center gap-1 text-xs font-bold text-slate-500">
                  <Smartphone aria-hidden size={13} />
                  {p.maxDevices}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
      {plans.length === 0 && <p className="py-12 text-center text-sm font-semibold text-slate-500">No packages yet</p>}
      {editing && <PlanEditor id={editing.id} initial={editing.form} onClose={() => setEditing(null)} />}
    </>
  );
}
