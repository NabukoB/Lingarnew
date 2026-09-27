"use client";

import { MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { buySMSCredits, saveSettings } from "@/lib/actions";
import { normalizeKenyanPhone } from "@/lib/format";
import { prettyPhone, type ApiTenant } from "@/lib/mappers";
import { Field, inputClass, primaryClass } from "../forms/fields";
import { Saved, Section, Toggle, toInput, useTransaction, type SettingsInput } from "./common";

const DEFAULT_TEMPLATE = "Your {business} hotspot package ({package}) has expired. Buy another package to reconnect: {link}";
const PLACEHOLDERS = ["{business}", "{package}", "{link}", "{code}", "{support}"];
const PACKS = [100, 500, 1000, 5000];

function smsParts(text: string): number {
  // eslint-disable-next-line no-control-regex
  const unicode = /[^\x00-\x7F€£¥èéùìòÇØøÅåÄäÖöÑñÜüß¿¡]/.test(text);
  const [single, multi] = unicode ? [70, 67] : [160, 153];
  return text.length <= single ? 1 : Math.ceil(text.length / multi);
}

export function SmsSettings({ tenant }: { tenant: ApiTenant }) {
  const router = useRouter();
  const [f, setF] = useState<SettingsInput>(toInput(tenant));
  const [saved, setSaved] = useState<{ ok: boolean; text: string } | null>(null);
  const [phone, setPhone] = useState(prettyPhone(tenant.support_phone));
  const [pack, setPack] = useState(500);
  const refresh = useCallback(() => router.refresh(), [router]);
  const topup = useTransaction(refresh);
  const set = <K extends keyof SettingsInput>(k: K, v: SettingsInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const template = f.hotspot_expiry_sms_template ?? DEFAULT_TEMPLATE;
  const sample = template
    .replaceAll("{business}", f.name)
    .replaceAll("{package}", "1 day")
    .replaceAll("{link}", "portal.example.com")
    .replaceAll("{code}", "RKT8765432")
    .replaceAll("{support}", "0712 345 678");

  async function save() {
    const r = await saveSettings(f);
    setSaved(r.ok ? { ok: true, text: "Saved" } : { ok: false, text: r.error });
    if (r.ok) router.refresh();
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-5">
      <Section title="Credits">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-blue-50 text-blue-600">
            <MessageSquare aria-hidden size={22} />
          </span>
          <span className="tabular text-3xl font-extrabold tracking-tight">{tenant.sms_credits.toLocaleString("en-KE")}</span>
          <span className="text-sm font-bold text-slate-500">left</span>
        </div>
        <div role="group" aria-label="Pack" className="grid grid-cols-4 gap-2">
          {PACKS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={pack === p}
              onClick={() => setPack(p)}
              className={pack === p ? "h-11 rounded-[14px] bg-blue-600 text-sm font-bold text-white" : "h-11 rounded-[14px] bg-slate-50 text-sm font-bold text-slate-700"}
            >
              {p.toLocaleString("en-KE")}
            </button>
          ))}
        </div>
        <Field label="Pay from">
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" className={inputClass} />
        </Field>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={topup.waiting}
            className={primaryClass}
            onClick={async () => {
              const msisdn = normalizeKenyanPhone(phone);
              if (!msisdn) return topup.setResult({ ok: false, text: "Enter a phone like 0712 345 678" });
              const r = await buySMSCredits(msisdn, pack);
              if (r.ok) topup.start(r.data.transactionId);
              else topup.setResult({ ok: false, text: r.error });
            }}
          >
            {topup.waiting ? "Enter PIN on phone…" : "Buy with M-Pesa"}
          </button>
          <Saved state={topup.result} />
        </div>
      </Section>

      <Section title="Messages">
        <Toggle label="Renewal reminders" checked={f.reminder_sms_enabled} onChange={(v) => set("reminder_sms_enabled", v)} />
        <Toggle label="Hotspot expiry SMS" checked={f.hotspot_expiry_sms_enabled} onChange={(v) => set("hotspot_expiry_sms_enabled", v)} />
        {f.hotspot_expiry_sms_enabled && (
          <div className="flex flex-col gap-2">
            <textarea
              rows={4}
              maxLength={300}
              value={template}
              onChange={(e) => set("hotspot_expiry_sms_template", e.target.value)}
              className="w-full rounded-2xl bg-white p-4 text-sm font-semibold shadow-soft outline-none focus:ring-2 focus:ring-blue-300"
            />
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map((p) => (
                <button key={p} type="button" onClick={() => set("hotspot_expiry_sms_template", template + " " + p)} className="rounded-full bg-blue-50 px-2.5 py-1 font-mono text-[11px] font-bold text-blue-700">
                  {p}
                </button>
              ))}
            </div>
            <span className={sample.length > 160 ? "text-xs font-bold text-amber-700" : "text-xs font-bold text-slate-500"}>
              {sample.length} chars · {smsParts(sample)} credit{smsParts(sample) > 1 ? "s" : ""} each
            </span>
          </div>
        )}
        <Field label="Sender ID">
          <input value={f.sms_sender} maxLength={11} onChange={(e) => set("sms_sender", e.target.value)} placeholder="Default" className={inputClass} />
        </Field>
        <div className="flex items-center gap-3">
          <button type="button" onClick={save} className={primaryClass}>
            Save
          </button>
          <Saved state={saved} />
        </div>
      </Section>
    </div>
  );
}
