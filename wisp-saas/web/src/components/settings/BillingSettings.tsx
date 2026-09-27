"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { paySubscription } from "@/lib/actions";
import { normalizeKenyanPhone } from "@/lib/format";
import { longDate, prettyPhone, type ApiTenant } from "@/lib/mappers";
import { Field, inputClass, primaryClass } from "../forms/fields";
import { Saved, Section, useTransaction } from "./common";

const MONTHS = [1, 3, 6, 12];

export function BillingSettings({ tenant }: { tenant: ApiTenant }) {
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);
  const pay = useTransaction(refresh);
  const [months, setMonths] = useState(1);
  const [phone, setPhone] = useState(prettyPhone(tenant.support_phone));
  const status = tenant.subscription_status;
  const until = status === "trial" ? tenant.trial_ends_at : tenant.subscription_expires_at;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-5">
      <Section title="Subscription">
        <div className="flex items-center gap-3">
          <span
            className={clsx(
              "rounded-full px-3 py-1 text-sm font-extrabold capitalize",
              status === "active" ? "bg-green-100 text-green-700" : status === "trial" ? "bg-blue-50 text-blue-700" : "bg-red-100 text-red-700",
            )}
          >
            {status === "lapsed" ? "Expired" : status}
          </span>
          {until && <span className="text-sm font-bold text-slate-500">{status === "lapsed" ? "since" : "until"} {longDate(until)}</span>}
        </div>
        {status === "lapsed" && <span className="text-[13px] font-semibold text-slate-600">Customers stay online. Changes are paused.</span>}
      </Section>

      <Section title="Pay">
        <div role="group" aria-label="Months" className="grid grid-cols-4 gap-2">
          {MONTHS.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={months === m}
              onClick={() => setMonths(m)}
              className={months === m ? "h-11 rounded-[14px] bg-blue-600 text-sm font-bold text-white" : "h-11 rounded-[14px] bg-slate-50 text-sm font-bold text-slate-700"}
            >
              {m} mo
            </button>
          ))}
        </div>
        <Field label="Pay from">
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" className={inputClass} />
        </Field>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={pay.waiting}
            className={primaryClass}
            onClick={async () => {
              const msisdn = normalizeKenyanPhone(phone);
              if (!msisdn) return pay.setResult({ ok: false, text: "Enter a phone like 0712 345 678" });
              const r = await paySubscription(msisdn, months);
              if (r.ok) pay.start(r.data.transactionId);
              else pay.setResult({ ok: false, text: r.error });
            }}
          >
            {pay.waiting ? "Enter PIN on phone…" : "Pay with M-Pesa"}
          </button>
          <Saved state={pay.result} />
        </div>
      </Section>
    </div>
  );
}
