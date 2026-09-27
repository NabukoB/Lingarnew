"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { changePassword, registerC2B, saveMpesaCredentials, saveSettings } from "@/lib/actions";
import type { ApiTenant } from "@/lib/mappers";
import { Field, inputClass, primaryClass, secondaryClass } from "../forms/fields";
import { Saved, Section, toInput, type SettingsInput } from "./common";

export function GeneralSettings({ tenant }: { tenant: ApiTenant }) {
  const router = useRouter();
  const [f, setF] = useState<SettingsInput>(toInput(tenant));
  const [saved, setSaved] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof SettingsInput>(k: K, v: SettingsInput[K]) => setF((x) => ({ ...x, [k]: v }));

  const [creds, setCreds] = useState({ consumer_key: "", consumer_secret: "", passkey: "" });
  const [credsNote, setCredsNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [c2bNote, setC2bNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwNote, setPwNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    const r = await saveSettings(f);
    setBusy(false);
    setSaved(r.ok ? { ok: true, text: "Saved" } : { ok: false, text: r.error });
    if (r.ok) router.refresh();
  }

  return (
    <form onSubmit={save} className="grid items-start gap-4 lg:grid-cols-2 lg:gap-5">
      <Section title="Business">
        <Field label="Name">
          <input required value={f.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Support phone">
          <input type="tel" value={f.support_phone} onChange={(e) => set("support_phone", e.target.value)} placeholder="0712 345 678" className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Account prefix">
            <input disabled value={tenant.account_prefix} className={clsx(inputClass, "tracking-widest opacity-70")} />
          </Field>
          <Field label="Grace (hours)">
            <input type="number" min={0} max={168} value={f.grace_hours} onChange={(e) => set("grace_hours", Number(e.target.value))} className={inputClass} />
          </Field>
        </div>
      </Section>

      <Section title="M-Pesa">
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <div role="group" aria-label="Shortcode type" className="flex h-12 rounded-2xl bg-slate-100 p-1">
            {(["till", "paybill"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={f.mpesa_shortcode_type === k}
                onClick={() => set("mpesa_shortcode_type", k)}
                className={clsx("rounded-xl px-3.5 text-[13px] font-bold capitalize", f.mpesa_shortcode_type === k ? "bg-white shadow-soft" : "text-slate-500")}
              >
                {k}
              </button>
            ))}
          </div>
          <input inputMode="numeric" value={f.mpesa_shortcode} onChange={(e) => set("mpesa_shortcode", e.target.value.trim())} placeholder="Number" className={inputClass} />
        </div>
        {f.mpesa_shortcode_type === "till" && (
          <Field label="Store number (H.O.)">
            <input inputMode="numeric" value={f.mpesa_store_number} onChange={(e) => set("mpesa_store_number", e.target.value.trim())} placeholder="Same as till" className={inputClass} />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Daraja app">
            <select value={f.mpesa_mode} onChange={(e) => set("mpesa_mode", e.target.value as "platform" | "own")} className={inputClass}>
              <option value="platform">Ours (easy)</option>
              <option value="own">My own</option>
            </select>
          </Field>
          <Field label="Environment">
            <select value={f.mpesa_env} onChange={(e) => set("mpesa_env", e.target.value)} className={inputClass}>
              <option value="sandbox">Sandbox</option>
              <option value="production">Live</option>
            </select>
          </Field>
        </div>
        {(f.mpesa_mode === "own" || tenant.mpesa_own_credentials_set) && (
          <div className="flex flex-col gap-2.5 rounded-2xl bg-slate-50 p-3.5">
            <span className="text-xs font-bold text-slate-500">{tenant.mpesa_own_credentials_set ? "Daraja keys saved · replace" : "Daraja keys"}</span>
            {(["consumer_key", "consumer_secret", "passkey"] as const).map((k) => (
              <input
                key={k}
                type="password"
                autoComplete="off"
                placeholder={k.replace("_", " ")}
                value={creds[k]}
                onChange={(e) => setCreds((c) => ({ ...c, [k]: e.target.value }))}
                className={inputClass}
              />
            ))}
            <div className="flex items-center gap-3">
              <button
                type="button"
                className={secondaryClass}
                onClick={async () => {
                  const r = await saveMpesaCredentials(creds);
                  setCredsNote(r.ok ? { ok: true, text: "Keys saved" } : { ok: false, text: r.error });
                  if (r.ok) {
                    setCreds({ consumer_key: "", consumer_secret: "", passkey: "" });
                    router.refresh();
                  }
                }}
              >
                Save keys
              </button>
              <Saved state={credsNote} />
            </div>
          </div>
        )}
        {f.mpesa_shortcode_type === "paybill" && tenant.mpesa_shortcode && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={secondaryClass}
              onClick={async () => {
                const r = await registerC2B();
                setC2bNote(r.ok ? { ok: true, text: "Paybill payments linked" } : { ok: false, text: r.error });
              }}
            >
              Link Paybill payments
            </button>
            <Saved state={c2bNote} />
          </div>
        )}
      </Section>

      <Section title="Portal">
        <div className="grid grid-cols-[88px_1fr] gap-3">
          <Field label="Colour">
            <input type="color" value={f.primary_color} onChange={(e) => set("primary_color", e.target.value)} className="h-12 w-full cursor-pointer rounded-2xl bg-white p-1.5 shadow-soft" />
          </Field>
          <Field label="Logo URL">
            <input type="url" value={f.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://…" className={inputClass} />
          </Field>
        </div>
        <Field label="Own domain">
          <input value={f.portal_domain} onChange={(e) => set("portal_domain", e.target.value)} placeholder="wifi.yourisp.co.ke" className={inputClass} />
        </Field>
        <a href={`/portal?t=${tenant.slug}`} target="_blank" rel="noreferrer" className="text-[13px] font-bold text-blue-600">
          Preview portal
        </a>
      </Section>

      <Section title="Password">
        <input type="password" autoComplete="current-password" placeholder="Current" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} className={inputClass} />
        <input type="password" autoComplete="new-password" placeholder="New (8+ characters)" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} className={inputClass} />
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!pw.current || pw.next.length < 8}
            className={secondaryClass}
            onClick={async () => {
              const r = await changePassword(pw.current, pw.next);
              setPwNote(r.ok ? { ok: true, text: "Password changed" } : { ok: false, text: r.error });
              if (r.ok) setPw({ current: "", next: "" });
            }}
          >
            Change password
          </button>
          <Saved state={pwNote} />
        </div>
      </Section>

      <div className="sticky bottom-24 z-10 flex items-center gap-3 lg:bottom-6 lg:col-span-2">
        <button type="submit" disabled={busy} className={primaryClass + " px-8"}>
          {busy ? "…" : "Save"}
        </button>
        <Saved state={saved} />
      </div>
    </form>
  );
}
