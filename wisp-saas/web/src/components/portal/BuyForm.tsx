"use client";

import clsx from "clsx";
import { ArrowRight, Clock, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { HotspotPackage } from "@/lib/types";
import { formatKsh, normalizeKenyanPhone } from "@/lib/format";
import { PrimaryButton } from "./PrimaryButton";

export function BuyForm({
  packages,
  shortcodeLabel,
}: {
  packages: HotspotPackage[];
  shortcodeLabel: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(packages[2]?.id ?? packages[0]?.id ?? "");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pkg = packages.find((p) => p.id === selected);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const msisdn = normalizeKenyanPhone(phone);
    if (!msisdn) {
      setError("Enter a Safaricom number, e.g. 0712 345 678");
      return;
    }
    if (!pkg) return;
    router.push(`/portal/pay?pkg=${pkg.id}&phone=${msisdn}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-grow flex-col gap-4">
      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="sr-only">Choose a package</legend>
        {packages.map((p) => {
          const on = p.id === selected;
          return (
            <label
              key={p.id}
              className={clsx(
                "flex min-h-[146px] cursor-pointer flex-col items-start gap-1 rounded-[20px] p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-300",
                on ? "text-white shadow-brand" : "bg-white text-slate-900 shadow-card",
              )}
              style={on ? { background: "var(--accent)" } : undefined}
            >
              <input type="radio" name="pkg" value={p.id} checked={on} onChange={() => setSelected(p.id)} className="sr-only" />
              <span className={clsx("mb-1.5 flex h-[30px] w-[30px] items-center justify-center rounded-[10px]", on ? "bg-white/20" : "bg-blue-50")} style={on ? undefined : { color: "var(--accent)" }}>
                <Clock aria-hidden size={16} strokeWidth={2.2} />
              </span>
              <span className="text-2xl font-extrabold tracking-tight">{p.label}</span>
              <span className={clsx("text-xs font-bold", on ? "text-blue-100" : "text-slate-500")}>{p.mbps} Mbps</span>
              <span className="mt-1.5 text-[17px] font-extrabold">{formatKsh(p.price)}</span>
            </label>
          );
        })}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label className="flex h-[58px] items-center gap-2.5 rounded-2xl bg-white px-2 shadow-card">
          <span className="flex h-[42px] items-center rounded-xl bg-ground px-2.5 text-sm font-bold text-slate-700">+254</span>
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
          <Smartphone aria-hidden size={20} className="mr-2 text-slate-400" />
        </label>
        {error && (
          <span id="phone-error" role="alert" className="px-2 text-[13px] font-semibold text-red-700">
            {error}
          </span>
        )}
      </div>

      <div className="mt-auto flex flex-col items-center gap-2 pb-6 pt-3">
        <PrimaryButton type="submit" disabled={!pkg}>
          Pay {pkg ? formatKsh(pkg.price) : ""}
          <ArrowRight aria-hidden size={18} strokeWidth={2.6} />
        </PrimaryButton>
        <span className="text-xs font-semibold text-slate-500">{shortcodeLabel}</span>
      </div>
    </form>
  );
}
