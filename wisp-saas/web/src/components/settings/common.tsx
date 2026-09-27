"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/bits";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "@/components/ui/sonner";
import { transactionStatus } from "@/lib/actions";
import { prettyPhone, type ApiTenant } from "@/lib/mappers";
import { cn } from "@/lib/utils";

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
  { value: "/settings", label: "General", href: "/settings" },
  { value: "/settings/sms", label: "SMS", href: "/settings/sms" },
  { value: "/settings/billing", label: "Billing", href: "/settings/billing" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <PageHeader title="Settings">
      <Segmented id="settings-tabs" label="Settings" items={tabs} value={pathname} />
    </PageHeader>
  );
}

export function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card aria-label={title} className={cn("flex flex-col gap-3.5 p-5", className)}>
      <h2 className="text-base font-extrabold">{title}</h2>
      {children}
    </Card>
  );
}

/** Follows an STK push we started until M-Pesa answers, then toasts the result. */
export function useTransaction(onDone: () => void) {
  const [tx, setTx] = useState<string | null>(null);
  useEffect(() => {
    if (!tx) return;
    const t = setInterval(async () => {
      const r = await transactionStatus(tx);
      if (!r.ok || r.data.status === "pending") return;
      setTx(null);
      if (r.data.status === "success") toast.success(r.data.message);
      else toast.error(r.data.message);
      onDone();
    }, 3000);
    return () => clearInterval(t);
  }, [tx, onDone]);
  return { waiting: tx !== null, start: (id: string) => setTx(id) };
}
