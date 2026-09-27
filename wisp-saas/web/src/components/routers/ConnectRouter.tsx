"use client";

import clsx from "clsx";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CopyButton } from "../CopyButton";
import { ErrorLine, Field, inputClass, primaryClass } from "../forms/fields";
import { createLocation, createRouter, newSetupCommand, routerProgress, type RouterProgress, type Setup } from "@/lib/actions";
import type { Location } from "@/lib/types";

const splitPorts = (s: string) =>
  s
    .split(/[\s,]+/)
    .map((p) => p.trim())
    .filter(Boolean);

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span
        className={clsx(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold",
          done ? "bg-green-100 text-green-700" : "bg-blue-50 text-blue-600",
        )}
      >
        {done ? <Check aria-hidden size={16} strokeWidth={3} /> : n}
      </span>
      <div className="flex min-w-0 flex-grow flex-col gap-2.5">
        <h2 className="pt-1 text-base font-bold">{title}</h2>
        {children}
      </div>
    </li>
  );
}

export function ConnectRouter({
  locations,
  existing,
}: {
  locations: Location[];
  /** Resume an existing router (from its page) instead of creating one. */
  existing?: { id: string; name: string; setup?: Setup };
}) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "new");
  const [newLocation, setNewLocation] = useState("");
  const [name, setName] = useState("");
  const [hotspot, setHotspot] = useState("ether3, ether4, ether5");
  const [pppoe, setPppoe] = useState("ether2");
  const [error, setError] = useState<{ error: string; hint?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [router, setRouter] = useState<{ id: string; name: string } | null>(existing ? { id: existing.id, name: existing.name } : null);
  const [setup, setSetup] = useState<Setup | null>(existing?.setup ?? null);
  const [progress, setProgress] = useState<RouterProgress | null>(null);

  const online = progress?.status === "online" || progress?.status === "degraded";

  useEffect(() => {
    if (!router || online) return;
    let stop = false;
    const tick = async () => {
      const r = await routerProgress(router.id);
      if (!stop && r.ok) setProgress(r.data);
    };
    void tick();
    const t = setInterval(tick, 5000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [router, online]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    let loc = locationId;
    if (loc === "new") {
      const l = await createLocation(newLocation.trim() || name.trim());
      if (!l.ok) {
        setBusy(false);
        return setError(l);
      }
      loc = l.data.id;
    }
    const r = await createRouter({ location_id: loc, name: name.trim(), hotspot_ports: splitPorts(hotspot), pppoe_ports: splitPorts(pppoe) });
    setBusy(false);
    if (!r.ok) return setError(r);
    setRouter({ id: r.data.id, name: name.trim() });
    setSetup(r.data.setup);
  }

  async function regenerate() {
    if (!router) return;
    const r = await newSetupCommand(router.id);
    if (r.ok) setSetup(r.data);
    else setError(r);
  }

  const expired = setup ? Date.parse(setup.expires_at) < Date.now() : false;

  return (
    <>
      <header className="flex flex-wrap items-center gap-3.5">
        <Link href="/network" aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-soft">
          <ArrowLeft aria-hidden size={20} strokeWidth={2.2} />
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">{router ? router.name : "Add router"}</h1>
        <span className="ml-auto text-xs font-bold text-slate-500">RouterOS 7.1+</span>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-5">
        <section aria-label="Setup steps" className="rounded-card bg-white p-5 shadow-card lg:p-6">
          <ol className="flex flex-col gap-6">
            <Step n={1} title="Router details" done={!!router}>
              {!router && (
                <form onSubmit={submit} className="flex flex-col gap-3">
                  <Field label="Name">
                    <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ruiru Mast" className={inputClass} />
                  </Field>
                  <Field label="Location">
                    <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={inputClass}>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                      <option value="new">+ New location</option>
                    </select>
                  </Field>
                  {locationId === "new" && (
                    <Field label="New location">
                      <input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="Ruiru" className={inputClass} />
                    </Field>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Hotspot ports">
                      <input value={hotspot} onChange={(e) => setHotspot(e.target.value)} placeholder="ether3, wlan1" className={inputClass} />
                    </Field>
                    <Field label="PPPoE ports">
                      <input value={pppoe} onChange={(e) => setPppoe(e.target.value)} placeholder="ether2" className={inputClass} />
                    </Field>
                  </div>
                  <ErrorLine error={error?.error} hint={error?.hint} />
                  <button type="submit" disabled={busy} className={primaryClass}>
                    {busy ? "…" : "Get command"}
                  </button>
                </form>
              )}
            </Step>
            <Step n={2} title="Open terminal" done={online}>
              {router && !online && <span className="text-[13px] font-semibold text-slate-500">WinBox → New Terminal</span>}
            </Step>
            <Step n={3} title="Paste & press Enter" done={online}>
              {setup && !online && (
                <>
                  <pre className="whitespace-pre-wrap break-all rounded-[18px] bg-slate-900 p-4 font-mono text-[12.5px] leading-relaxed text-blue-100">{setup.command}</pre>
                  <div className="flex items-center gap-3">
                    {expired ? (
                      <button type="button" onClick={regenerate} className="h-11 rounded-full bg-blue-600 px-5 text-sm font-bold text-white shadow-brand">
                        New command
                      </button>
                    ) : (
                      <CopyButton
                        text={setup.command}
                        label="Copy command"
                        showLabel
                        className="h-11 rounded-full bg-blue-600 px-5 text-sm font-bold text-white shadow-brand hover:bg-blue-700"
                      />
                    )}
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">{expired ? "Expired" : "Valid 24h"}</span>
                  </div>
                  {error && router && <ErrorLine error={error.error} hint={error.hint} />}
                </>
              )}
            </Step>
          </ol>
        </section>

        <section aria-label="Connection status" className="overflow-hidden rounded-card bg-white shadow-card">
          {online ? (
            <div className="flex items-center gap-3.5 bg-gradient-to-br from-green-50 to-white p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-600 shadow-[0_8px_18px_rgba(22,163,74,0.3)]">
                <Check aria-hidden size={24} strokeWidth={3} className="text-white" />
              </span>
              <div className="flex flex-col">
                <span className="text-[22px] font-extrabold tracking-tight text-green-900">Router connected!</span>
                <span className="text-[13px] font-semibold text-green-700">{[progress?.board, progress?.version].filter(Boolean).join(" · ")}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3.5 p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100">
                <Loader2 aria-hidden size={22} className={clsx("text-slate-400", router && "animate-spin")} />
              </span>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold tracking-tight">{router ? (progress?.connected ? "Dialing home…" : "Waiting for router") : "Not started"}</span>
                <span className="text-[13px] font-semibold text-slate-500">{router ? "Checks every 5s" : "Fill in step 1"}</span>
              </div>
            </div>
          )}
          {online && (
            <ul className="px-5 pb-3 pt-1.5">
              {progress!.items.map((c) => (
                <li key={c.key} className="flex items-center gap-3 border-t border-line py-2.5">
                  <span className={clsx("flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full", c.ok ? "bg-green-100" : "bg-amber-100")}>
                    {c.ok ? (
                      <Check aria-hidden size={12} strokeWidth={3.4} className="text-green-700" />
                    ) : (
                      <X aria-hidden size={12} strokeWidth={3.4} className="text-amber-700" />
                    )}
                  </span>
                  <span className="flex-grow text-sm font-semibold">{c.label}</span>
                  {!c.ok && c.hint && <span className="max-w-[55%] text-right text-xs font-semibold text-amber-700">{c.hint}</span>}
                </li>
              ))}
            </ul>
          )}
          {online && (
            <div className="flex gap-2.5 px-5 pb-5 pt-1">
              <Link href="/" className="flex h-12 flex-grow items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-brand hover:bg-blue-700">
                Done
              </Link>
              <Link href="/portal" className="flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">
                Preview portal
              </Link>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
