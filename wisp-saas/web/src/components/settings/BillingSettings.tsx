"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "@/components/ui/sonner";
import { paySubscription } from "@/lib/actions";
import { normalizeKenyanPhone } from "@/lib/format";
import { longDate, prettyPhone, type ApiTenant } from "@/lib/mappers";
import { Section, useTransaction } from "./common";

const MONTHS = ["1", "3", "6", "12"];

export function BillingSettings({ tenant }: { tenant: ApiTenant }) {
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);
  const pay = useTransaction(refresh);
  const [months, setMonths] = useState("1");
  const [phone, setPhone] = useState(prettyPhone(tenant.support_phone));
  const [busy, setBusy] = useState(false);
  const status = tenant.subscription_status;
  const until = status === "trial" ? tenant.trial_ends_at : tenant.subscription_expires_at;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-5">
      <Section title="Subscription">
        <div className="flex items-center gap-3">
          <Badge variant={status === "active" ? "success" : status === "trial" ? "default" : "danger"} className="px-3 py-1 text-sm capitalize">
            {status === "lapsed" ? "Expired" : status}
          </Badge>
          {until && (
            <span className="text-sm font-bold text-muted-foreground">
              {status === "lapsed" ? "since" : "until"} {longDate(until)}
            </span>
          )}
        </div>
        {status === "lapsed" && <span className="text-[13px] font-semibold text-muted-foreground">Customers stay online. Changes are paused.</span>}
      </Section>

      <Section title="Pay">
        <Segmented id="bill-months" label="Months" size="md" value={months} onValueChange={setMonths} items={MONTHS.map((m) => ({ value: m, label: `${m} mo` }))} />
        <Field label="Pay from" htmlFor="bill-phone">
          <Input id="bill-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" />
        </Field>
        <Button
          size="lg"
          loading={busy || pay.waiting}
          onClick={async () => {
            const msisdn = normalizeKenyanPhone(phone);
            if (!msisdn) return toast.error("Use a phone like 0712 345 678");
            setBusy(true);
            const r = await paySubscription(msisdn, Number(months));
            setBusy(false);
            if (!r.ok) return toast.error(r.error);
            toast("Enter your M-Pesa PIN", { description: `KSh ${r.data.amount}` });
            pay.start(r.data.transactionId);
          }}
        >
          {pay.waiting ? "Enter PIN on phone…" : "Pay with M-Pesa"}
        </Button>
      </Section>
    </div>
  );
}
