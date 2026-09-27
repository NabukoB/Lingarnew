"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { transactionStatus } from "@/lib/actions";
import { prettyPhone, type ApiTenant } from "@/lib/mappers";

export type SettingsInput = {
  name: string;
  support_phone: string;
  mpesa_mode: "platform" | "own";
  mpesa_shortcode_type: "till" | "paybill";
  mpesa_shortcode: string;
  mpesa_store_number: string;
  mpesa_env: string;
  primary_color: string;
  logo_url: string;
  portal_domain: string;
  grace_hours: number;
  reminder_sms_enabled: boolean;
  hotspot_expiry_sms_enabled: boolean;
  hotspot_expiry_sms_template: string | null;
  sms_sender: string;
  timezone: string;
};

export function toInput(t: ApiTenant): SettingsInput {
  return {
    name: t.name,
    support_phone: prettyPhone(t.support_phone),
    mpesa_mode: t.mpesa_mode,
    mpesa_shortcode_type: t.mpesa_shortcode_type,
    mpesa_shortcode: t.mpesa_shortcode ?? "",
    mpesa_store_number: t.mpesa_store_number ?? "",
    mpesa_env: t.mpesa_env,
    primary_color: t.primary_color,
    logo_url: t.logo_url ?? "",
    portal_domain: t.portal_domain ?? "",
    grace_hours: t.grace_hours,
    reminder_sms_enabled: t.reminder_sms_enabled,
    hotspot_expiry_sms_enabled: t.hotspot_expiry_sms_enabled,
    hotspot_expiry_sms_template: t.hotspot_expiry_sms_template,
    sms_sender: t.sms_sender ?? "",
    timezone: t.timezone,
  };
}

const tabs = [
  { label: "General", href: "/settings" },
  { label: "SMS", href: "/settings/sms" },
  { label: "Billing", href: "/settings/billing" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <header className="flex flex-wrap items-center gap-3">
      <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
      <nav aria-label="Settings" className="flex rounded-xl bg-white p-[3px] shadow-soft">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={pathname === t.href ? "page" : undefined}
            className={clsx("h-9 rounded-[10px] px-3.5 text-[13px] font-bold leading-9", pathname === t.href ? "bg-blue-600 text-white" : "text-slate-500")}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={clsx("flex flex-col gap-3.5 rounded-card bg-white p-5 shadow-card", className)}>
      <h2 className="text-base font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="flex-grow text-sm font-bold">{label}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className="relative h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-300">
        <span className={clsx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </span>
    </label>
  );
}

export function Saved({ state }: { state: { ok: boolean; text: string } | null }) {
  if (!state) return null;
  return <span className={clsx("text-[13px] font-bold", state.ok ? "text-green-700" : "text-red-700")}>{state.text}</span>;
}

/** Follows an STK push we started until M-Pesa answers. */
export function useTransaction(onDone: () => void) {
  const [tx, setTx] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    if (!tx) return;
    const t = setInterval(async () => {
      const r = await transactionStatus(tx);
      if (!r.ok || r.data.status === "pending") return;
      setTx(null);
      setResult({ ok: r.data.status === "success", text: r.data.message });
      onDone();
    }, 3000);
    return () => clearInterval(t);
  }, [tx, onDone]);
  return { waiting: tx !== null, start: (id: string) => (setResult(null), setTx(id)), result, setResult };
}
