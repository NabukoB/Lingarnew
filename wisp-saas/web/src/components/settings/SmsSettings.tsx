"use client";

import { MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { CountUp } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "@/components/ui/sonner";
import { SwitchRow } from "@/components/ui/switch";
import { buySMSCredits, saveSettings } from "@/lib/actions";
import { normalizeKenyanPhone } from "@/lib/format";
import { prettyPhone, type ApiTenant } from "@/lib/mappers";
import { cn } from "@/lib/utils";
import { Section, toInput, useTransaction, type SettingsInput } from "./common";

const DEFAULT_TEMPLATE = "Your {business} hotspot package ({package}) has expired. Buy another package to reconnect: {link}";
const PLACEHOLDERS = ["{business}", "{package}", "{link}", "{code}", "{support}"];
const PACKS = ["100", "500", "1000", "5000"];

export function smsParts(text: string): number {
  // eslint-disable-next-line no-control-regex
  const unicode = /[^\x00-\x7F€£¥èéùìòÇØøÅåÄäÖöÑñÜüß¿¡]/.test(text);
  const [single, multi] = unicode ? [70, 67] : [160, 153];
  return text.length <= single ? 1 : Math.ceil(text.length / multi);
}

export function SmsSettings({ tenant }: { tenant: ApiTenant }) {
  const router = useRouter();
  const [f, setF] = useState<SettingsInput>(toInput(tenant));
  const [phone, setPhone] = useState(prettyPhone(tenant.support_phone));
  const [pack, setPack] = useState("500");
  const [saving, setSaving] = useState(false);
  const [buying, setBuying] = useState(false);
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
  const parts = smsParts(sample);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-5">
      <Section title="Credits">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-accent text-primary">
            <MessageSquare aria-hidden size={22} />
          </span>
          <CountUp value={tenant.sms_credits} className="text-3xl font-extrabold tracking-tight" />
          <span className="text-sm font-bold text-muted-foreground">left</span>
        </div>
        <Segmented id="sms-pack" label="Pack" size="md" value={pack} onValueChange={setPack} items={PACKS.map((p) => ({ value: p, label: Number(p).toLocaleString("en-KE") }))} />
        <Field label="Pay from" htmlFor="sms-phone">
          <Input id="sms-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" />
        </Field>
        <Button
          size="lg"
          loading={buying || topup.waiting}
          onClick={async () => {
            const msisdn = normalizeKenyanPhone(phone);
            if (!msisdn) return toast.error("Use a phone like 0712 345 678");
            setBuying(true);
            const r = await buySMSCredits(msisdn, Number(pack));
            setBuying(false);
            if (!r.ok) return toast.error(r.error);
            toast("Enter your M-Pesa PIN", { description: `KSh ${r.data.amount}` });
            topup.start(r.data.transactionId);
          }}
        >
          {topup.waiting ? "Enter PIN on phone…" : "Buy with M-Pesa"}
        </Button>
      </Section>

      <Section title="Messages">
        <SwitchRow id="sms-rem" label="Renewal reminders" checked={f.reminder_sms_enabled} onCheckedChange={(v) => set("reminder_sms_enabled", v)} />
        <SwitchRow id="sms-exp" label="Hotspot expiry SMS" checked={f.hotspot_expiry_sms_enabled} onCheckedChange={(v) => set("hotspot_expiry_sms_enabled", v)} />
        {f.hotspot_expiry_sms_enabled && (
          <div className="flex flex-col gap-2">
            <Textarea aria-label="Expiry SMS" rows={4} maxLength={300} value={template} onChange={(e) => set("hotspot_expiry_sms_template", e.target.value)} />
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map((p) => (
                <button key={p} type="button" onClick={() => set("hotspot_expiry_sms_template", template + " " + p)} className="rounded-full bg-accent px-2.5 py-1 font-mono text-[11px] font-bold text-accent-foreground transition active:scale-95">
                  {p}
                </button>
              ))}
            </div>
            <span className={cn("text-xs font-bold", sample.length > 160 ? "text-amber-700" : "text-muted-foreground")}>
              {sample.length} chars · {parts} credit{parts > 1 ? "s" : ""} each
            </span>
          </div>
        )}
        <Field label="Sender ID" htmlFor="sms-sender">
          <Input id="sms-sender" value={f.sms_sender} maxLength={11} onChange={(e) => set("sms_sender", e.target.value)} placeholder="Default" />
        </Field>
        <Button
          size="lg"
          loading={saving}
          onClick={async () => {
            setSaving(true);
            const r = await saveSettings(f);
            setSaving(false);
            if (!r.ok) return toast.error(r.error);
            toast.success("Saved");
            router.refresh();
          }}
        >
          Save
        </Button>
      </Section>
    </div>
  );
}
