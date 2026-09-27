"use client";

import { AlertCircle, ArrowRight, Clock, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { m, Stagger, StaggerItem } from "@/components/motion";
import { formatKsh, normalizeKenyanPhone } from "@/lib/format";
import { buyPackage } from "@/lib/portal-actions";
import type { HotspotPackage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PrimaryButton } from "./PrimaryButton";

export function BuyForm({ packages, shortcodeLabel, notice = null }: { packages: HotspotPackage[]; shortcodeLabel: string; notice?: string | null }) {
  const router = useRouter();
  const [selected, setSelected] = useState(packages[2]?.id ?? packages[0]?.id ?? "");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(notice);
  const [busy, setBusy] = useState(false);
  const pkg = packages.find((p) => p.id === selected);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const msisdn = normalizeKenyanPhone(phone);
    if (!msisdn) {
      setError("Enter a Safaricom number, e.g. 0712 345 678");
      return;
    }
    if (!pkg || busy) return;
    setBusy(true);
    const r = await buyPackage(pkg.id, msisdn);
    if (!r.ok) {
      setError(r.error);
      setBusy(false);
      return;
    }
    router.push(`/portal/pay?p=${encodeURIComponent(r.data.purchaseId)}&pkg=${pkg.id}&phone=${msisdn}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-grow flex-col gap-4">
      <fieldset>
        <legend className="sr-only">Choose a package</legend>
        <Stagger className="grid grid-cols-2 gap-3">
          {packages.map((p) => {
            const on = p.id === selected;
            return (
              <StaggerItem key={p.id}>
                <m.label
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    "relative flex min-h-[146px] cursor-pointer flex-col items-start gap-1 overflow-hidden rounded-[20px] bg-card p-4 shadow-card transition-shadow has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    on && "shadow-brand",
                  )}
                >
                  {on && <m.span layoutId="pkg-selected" className="absolute inset-0 bg-brand" transition={{ type: "spring", stiffness: 480, damping: 38 }} />}
                  <input type="radio" name="pkg" value={p.id} checked={on} onChange={() => setSelected(p.id)} className="sr-only" />
                  <span className={cn("relative mb-1.5 flex h-[30px] w-[30px] items-center justify-center rounded-[10px] transition-colors", on ? "bg-white/20 text-white" : "bg-accent text-brand")}>
                    <Clock aria-hidden size={16} strokeWidth={2.2} />
                  </span>
                  <span className={cn("relative text-2xl font-extrabold tracking-tight transition-colors", on ? "text-white" : "text-foreground")}>{p.label}</span>
                  <span className={cn("relative text-xs font-bold transition-colors", on ? "text-white/80" : "text-muted-foreground")}>{p.mbps} Mbps</span>
                  <span className={cn("relative mt-1.5 text-[17px] font-extrabold transition-colors", on ? "text-white" : "text-foreground")}>{formatKsh(p.price)}</span>
                </m.label>
              </StaggerItem>
            );
          })}
        </Stagger>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label className="flex h-[58px] items-center gap-2.5 rounded-2xl bg-card px-2 shadow-card transition-shadow focus-within:ring-2 focus-within:ring-ring/40">
          <span className="flex h-[42px] items-center rounded-xl bg-background px-2.5 text-sm font-bold text-slate-700">+254</span>
          <span className="sr-only">M-Pesa number</span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="712 345 678"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "phone-error" : undefined}
            className="min-w-0 flex-grow bg-transparent text-lg font-semibold tracking-wide outline-none placeholder:text-slate-300"
          />
          <Smartphone aria-hidden size={20} className="mr-2 text-muted-foreground" />
        </label>
        {error && (
          <m.span id="phone-error" role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 px-2 text-[13px] font-semibold text-red-700">
            <AlertCircle aria-hidden className="h-3.5 w-3.5" />
            {error}
          </m.span>
        )}
      </div>

      <div className="sticky bottom-0 mt-auto flex flex-col items-center gap-2 bg-gradient-to-t from-background via-background to-transparent pb-6 pt-3">
        <PrimaryButton type="submit" disabled={!pkg} loading={busy}>
          Pay {pkg ? formatKsh(pkg.price) : ""}
          {!busy && <ArrowRight aria-hidden size={18} strokeWidth={2.6} />}
        </PrimaryButton>
        <span className="text-xs font-semibold text-muted-foreground">{shortcodeLabel}</span>
      </div>
    </form>
  );
}
