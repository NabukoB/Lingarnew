"use client";

import { ExternalLink, KeyRound, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { changePassword, registerC2B, saveMpesaCredentials, saveSettings } from "@/lib/actions";
import type { ApiTenant } from "@/lib/mappers";
import { Section, toInput, type SettingsInput } from "./common";

export function GeneralSettings({ tenant }: { tenant: ApiTenant }) {
  const router = useRouter();
  const [f, setF] = useState<SettingsInput>(toInput(tenant));
  const [busy, setBusy] = useState<string | null>(null);
  const set = <K extends keyof SettingsInput>(k: K, v: SettingsInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const [creds, setCreds] = useState({ consumer_key: "", consumer_secret: "", passkey: "" });
  const [pw, setPw] = useState({ current: "", next: "" });
  const dirty = JSON.stringify(f) !== JSON.stringify(toInput(tenant));

  async function act(name: string, fn: () => Promise<{ ok: boolean; error?: string; hint?: string }>, success: string, after?: () => void) {
    setBusy(name);
    const r = await fn();
    setBusy(null);
    if (!r.ok) return toast.error(r.error ?? "Failed", { description: r.hint });
    toast.success(success);
    after?.();
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void act("save", () => saveSettings(f), "Saved");
      }}
      className="grid items-start gap-4 lg:grid-cols-2 lg:gap-5"
    >
      <Section title="Business">
        <Field label="Name" htmlFor="s-name">
          <Input id="s-name" required value={f.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Support phone" htmlFor="s-phone">
          <Input id="s-phone" type="tel" value={f.support_phone} onChange={(e) => set("support_phone", e.target.value)} placeholder="0712 345 678" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Account prefix" htmlFor="s-prefix">
            <Input id="s-prefix" disabled value={tenant.account_prefix} className="tracking-widest" />
          </Field>
          <Field label="Grace (hours)" htmlFor="s-grace">
            <Input id="s-grace" type="number" inputMode="numeric" min={0} max={168} value={f.grace_hours} onChange={(e) => set("grace_hours", Number(e.target.value))} />
          </Field>
        </div>
      </Section>

      <Section title="M-Pesa">
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <Segmented
            id="shortcode-type"
            label="Shortcode type"
            tone="white"
            size="md"
            className="h-12 items-center"
            value={f.mpesa_shortcode_type}
            onValueChange={(v) => set("mpesa_shortcode_type", v as "till" | "paybill")}
            items={[
              { value: "till", label: "Till" },
              { value: "paybill", label: "Paybill" },
            ]}
          />
          <Input aria-label="Shortcode" inputMode="numeric" value={f.mpesa_shortcode} onChange={(e) => set("mpesa_shortcode", e.target.value.trim())} placeholder="Number" />
        </div>
        {f.mpesa_shortcode_type === "till" && (
          <Field label="Store number (H.O.)" htmlFor="s-store">
            <Input id="s-store" inputMode="numeric" value={f.mpesa_store_number} onChange={(e) => set("mpesa_store_number", e.target.value.trim())} placeholder="Same as till" />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Daraja app">
            <Select value={f.mpesa_mode} onValueChange={(v) => set("mpesa_mode", v as "platform" | "own")}>
              <SelectTrigger aria-label="Daraja app">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="platform">Ours (easy)</SelectItem>
                <SelectItem value="own">My own</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Environment">
            <Select value={f.mpesa_env} onValueChange={(v) => set("mpesa_env", v)}>
              <SelectTrigger aria-label="Environment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox</SelectItem>
                <SelectItem value="production">Live</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        {(f.mpesa_mode === "own" || tenant.mpesa_own_credentials_set) && (
          <div className="flex flex-col gap-2.5 rounded-2xl bg-muted/60 p-3.5">
            <span className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <KeyRound aria-hidden className="h-3.5 w-3.5" />
              {tenant.mpesa_own_credentials_set ? "Daraja keys saved · replace" : "Daraja keys"}
            </span>
            {(["consumer_key", "consumer_secret", "passkey"] as const).map((k) => (
              <Input key={k} type="password" autoComplete="off" aria-label={k.replace("_", " ")} placeholder={k.replace("_", " ")} value={creds[k]} onChange={(e) => setCreds((c) => ({ ...c, [k]: e.target.value }))} />
            ))}
            <Button
              type="button"
              variant="secondary"
              className="self-start"
              loading={busy === "creds"}
              disabled={!creds.consumer_key || !creds.consumer_secret || !creds.passkey}
              onClick={() => act("creds", () => saveMpesaCredentials(creds), "Keys saved", () => setCreds({ consumer_key: "", consumer_secret: "", passkey: "" }))}
            >
              Save keys
            </Button>
          </div>
        )}
        {f.mpesa_shortcode_type === "paybill" && tenant.mpesa_shortcode && (
          <Button type="button" variant="secondary" className="self-start" loading={busy === "c2b"} onClick={() => act("c2b", registerC2B, "Paybill payments linked")}>
            <Link2 aria-hidden className="h-4 w-4" />
            Link Paybill payments
          </Button>
        )}
      </Section>

      <Section title="Portal">
        <div className="grid grid-cols-[88px_1fr] gap-3">
          <Field label="Colour" htmlFor="s-color">
            <input id="s-color" type="color" value={f.primary_color} onChange={(e) => set("primary_color", e.target.value)} className="h-12 w-full cursor-pointer rounded-2xl bg-card p-1.5 shadow-soft" />
          </Field>
          <Field label="Logo URL" htmlFor="s-logo">
            <Input id="s-logo" type="url" value={f.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://…" />
          </Field>
        </div>
        <Field label="Own domain" htmlFor="s-domain">
          <Input id="s-domain" value={f.portal_domain} onChange={(e) => set("portal_domain", e.target.value)} placeholder="wifi.yourisp.co.ke" />
        </Field>
        <Button asChild variant="link" className="self-start">
          <a href={`/portal?t=${tenant.slug}`} target="_blank" rel="noreferrer">
            Preview portal
            <ExternalLink aria-hidden className="h-3.5 w-3.5" />
          </a>
        </Button>
      </Section>

      <Section title="Password">
        <Input type="password" autoComplete="current-password" aria-label="Current password" placeholder="Current" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} />
        <Input type="password" autoComplete="new-password" aria-label="New password" placeholder="New (8+ characters)" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
        <Button
          type="button"
          variant="secondary"
          className="self-start"
          loading={busy === "pw"}
          disabled={!pw.current || pw.next.length < 8}
          onClick={() => act("pw", () => changePassword(pw.current, pw.next), "Password changed", () => setPw({ current: "", next: "" }))}
        >
          Change password
        </Button>
      </Section>

      <div className="sticky bottom-24 z-10 lg:bottom-6 lg:col-span-2">
        <Button type="submit" size="lg" className="px-8" loading={busy === "save"} disabled={!dirty}>
          Save
        </Button>
      </div>
    </form>
  );
}
