"use client";

import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Loader2, TerminalSquare, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { m, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { createLocation, createRouter, newSetupCommand, routerProgress, type RouterProgress, type Setup } from "@/lib/actions";
import type { Location } from "@/lib/types";
import { cn } from "@/lib/utils";

const splitPorts = (s: string) =>
  s
    .split(/[\s,]+/)
    .map((p) => p.trim())
    .filter(Boolean);

function Step({ n, title, done, active, children }: { n: number; title: string; done?: boolean; active?: boolean; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <m.span
        layout
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold transition-colors",
          done ? "bg-green-100 text-green-700" : active ? "bg-primary text-white shadow-brand" : "bg-accent text-primary",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <m.span key={done ? "d" : "n"} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}>
            {done ? <Check aria-hidden size={16} strokeWidth={3} /> : n}
          </m.span>
        </AnimatePresence>
      </m.span>
      <div className="flex min-w-0 flex-grow flex-col gap-2.5">
        <h2 className={cn("pt-1 text-base font-bold", !active && !done && "text-muted-foreground")}>{title}</h2>
        {children}
      </div>
    </li>
  );
}

export function ConnectRouter({ locations, existing }: { locations: Location[]; existing?: { id: string; name: string; setup?: Setup } }) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "new");
  const [newLocation, setNewLocation] = useState("");
  const [name, setName] = useState("");
  const [hotspot, setHotspot] = useState("ether3, ether4, ether5");
  const [pppoe, setPppoe] = useState("ether2");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [router, setRouter] = useState<{ id: string; name: string } | null>(existing ? { id: existing.id, name: existing.name } : null);
  const [setup, setSetup] = useState<Setup | null>(existing?.setup ?? null);
  const [progress, setProgress] = useState<RouterProgress | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const online = progress?.status === "online" || progress?.status === "degraded";

  useEffect(() => {
    if (!router || online) return;
    let stop = false;
    const tick = async () => {
      const r = await routerProgress(router.id);
      if (!stop && r.ok) setProgress(r.data);
      setNow(Date.now());
    };
    void tick();
    const t = setInterval(tick, 4000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [router, online]);

  useEffect(() => {
    if (online) toast.success("Router connected!");
  }, [online]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    let loc = locationId;
    if (loc === "new") {
      const l = await createLocation(newLocation.trim() || name.trim());
      if (!l.ok) {
        setBusy(false);
        return setError(l.error);
      }
      loc = l.data.id;
    }
    const r = await createRouter({ location_id: loc, name: name.trim(), hotspot_ports: splitPorts(hotspot), pppoe_ports: splitPorts(pppoe) });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setRouter({ id: r.data.id, name: name.trim() });
    setSetup(r.data.setup);
  }

  async function regenerate() {
    if (!router) return;
    const r = await newSetupCommand(router.id);
    if (r.ok) setSetup(r.data);
    else toast.error(r.error);
  }

  const expired = setup ? Date.parse(setup.expires_at) < now : false;
  const step = !router ? 1 : online ? 4 : 3;

  return (
    <>
      <header className="flex flex-wrap items-center gap-3.5">
        <Button asChild variant="secondary" size="icon" aria-label="Back">
          <Link href="/network">
            <ArrowLeft aria-hidden size={20} strokeWidth={2.2} />
          </Link>
        </Button>
        <h1 className="text-2xl font-extrabold tracking-tight">{router ? router.name : "Add router"}</h1>
        <Badge variant="muted" className="ml-auto text-xs">
          RouterOS 7.1+
        </Badge>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-5">
        <Card aria-label="Setup steps" className="p-5 lg:p-6">
          <ol className="flex flex-col gap-6">
            <Step n={1} title="Router details" done={!!router} active={step === 1}>
              {!router && (
                <form onSubmit={submit} className="flex flex-col gap-3">
                  <Field label="Name" htmlFor="r-name">
                    <Input id="r-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ruiru Mast" />
                  </Field>
                  <Field label="Location">
                    <Select value={locationId} onValueChange={setLocationId}>
                      <SelectTrigger aria-label="Location">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="new">+ New location</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <AnimatePresence initial={false}>
                    {locationId === "new" && (
                      <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <Field label="New location" htmlFor="r-loc">
                          <Input id="r-loc" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="Ruiru" />
                        </Field>
                      </m.div>
                    )}
                  </AnimatePresence>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Hotspot ports" htmlFor="r-hs">
                      <Input id="r-hs" value={hotspot} onChange={(e) => setHotspot(e.target.value)} placeholder="ether3, wlan1" />
                    </Field>
                    <Field label="PPPoE ports" htmlFor="r-pp">
                      <Input id="r-pp" value={pppoe} onChange={(e) => setPppoe(e.target.value)} placeholder="ether2" />
                    </Field>
                  </div>
                  {error && (
                    <p role="alert" className="rounded-2xl bg-red-50 px-4 py-2.5 text-[13px] font-bold text-red-700">
                      {error}
                    </p>
                  )}
                  <Button type="submit" size="lg" loading={busy}>
                    Get command
                  </Button>
                </form>
              )}
            </Step>
            <Step n={2} title="Open terminal" done={online} active={step === 3}>
              {router && !online && (
                <span className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground">
                  <TerminalSquare aria-hidden className="h-4 w-4" />
                  WinBox → New Terminal
                </span>
              )}
            </Step>
            <Step n={3} title="Paste & press Enter" done={online} active={step === 3}>
              <AnimatePresence>
                {setup && !online && (
                  <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-2.5">
                    <pre className="whitespace-pre-wrap break-all rounded-[18px] bg-slate-900 p-4 font-mono text-[12.5px] leading-relaxed text-blue-100">{setup.command}</pre>
                    <div className="flex items-center gap-3">
                      {expired ? (
                        <Button onClick={regenerate} className="rounded-full">
                          New command
                        </Button>
                      ) : (
                        <CopyButton text={setup.command} label="Copy command" showLabel className="h-11 rounded-full bg-primary px-5 text-sm font-bold text-white shadow-brand hover:bg-primary/90" />
                      )}
                      <Badge variant={expired ? "danger" : "muted"} className="text-xs">
                        {expired ? "Expired" : "Valid 24h"}
                      </Badge>
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </Step>
          </ol>
        </Card>

        <Card aria-label="Connection status" aria-live="polite" className="overflow-hidden">
          <AnimatePresence mode="wait">
            {online ? (
              <m.div key="on" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3.5 bg-gradient-to-br from-green-50 to-white p-5">
                <m.span
                  initial={{ scale: 0, rotate: -40 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 14 }}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-600 shadow-[0_8px_18px_rgba(22,163,74,0.3)]"
                >
                  <Check aria-hidden size={24} strokeWidth={3} className="text-white" />
                </m.span>
                <div className="flex flex-col">
                  <span className="text-[22px] font-extrabold tracking-tight text-green-900">Router connected!</span>
                  <span className="text-[13px] font-semibold text-green-700">{[progress?.board, progress?.version].filter(Boolean).join(" · ")}</span>
                </div>
              </m.div>
            ) : (
              <m.div key="off" exit={{ opacity: 0 }} className="flex items-center gap-3.5 p-5">
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
                  {router && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/30" />}
                  <Loader2 aria-hidden size={22} className={cn("relative text-muted-foreground", router && "animate-spin text-primary")} />
                </span>
                <div className="flex flex-col">
                  <span className="text-lg font-extrabold tracking-tight">{router ? (progress?.connected ? "Dialing home…" : "Waiting for router") : "Not started"}</span>
                  <span className="text-[13px] font-semibold text-muted-foreground">{router ? "Checks every few seconds" : "Fill in step 1"}</span>
                </div>
              </m.div>
            )}
          </AnimatePresence>
          {online && progress && (
            <Stagger as="ul" className="px-5 pb-3 pt-1.5">
              {progress.items.map((c) => (
                <StaggerItem as="li" key={c.key} className="flex items-center gap-3 border-t border-line py-2.5">
                  <span className={cn("flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full", c.ok ? "bg-green-100" : "bg-amber-100")}>
                    {c.ok ? <Check aria-hidden size={12} strokeWidth={3.4} className="text-green-700" /> : <X aria-hidden size={12} strokeWidth={3.4} className="text-amber-700" />}
                  </span>
                  <span className="flex-grow text-sm font-semibold">{c.label}</span>
                  {!c.ok && c.hint && <span className="max-w-[55%] text-right text-xs font-semibold text-amber-700">{c.hint}</span>}
                </StaggerItem>
              ))}
            </Stagger>
          )}
          {online && (
            <div className="flex gap-2.5 px-5 pb-5 pt-1">
              <Button asChild size="lg" className="flex-grow">
                <Link href="/">Done</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/portal">Preview portal</Link>
              </Button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
