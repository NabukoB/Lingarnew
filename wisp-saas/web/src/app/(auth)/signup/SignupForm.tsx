"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { ErrorLine, Field, inputClass } from "@/components/forms/fields";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { prefixSuggestions, signup } from "@/lib/actions";
import type { ActionResult } from "@/lib/types";

export function SignupForm() {
  const [state, action] = useFormState<ActionResult | null, FormData>(signup, null);
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [touched, setTouched] = useState(false);
  const [kind, setKind] = useState<"till" | "paybill">("till");

  useEffect(() => {
    if (touched) return;
    const t = setTimeout(async () => {
      const s = await prefixSuggestions(name);
      if (s[0]) setPrefix(s[0]);
    }, 350);
    return () => clearTimeout(t);
  }, [name, touched]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Create account</h1>
      <Field label="Business name">
        <input name="business_name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jazmoge WiFi" className={inputClass} />
      </Field>
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <Field label="Email">
          <input name="email" type="email" autoComplete="email" required className={inputClass} />
        </Field>
        <Field label="Account prefix">
          <input
            name="account_prefix"
            value={prefix}
            onChange={(e) => {
              setTouched(true);
              setPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4));
            }}
            placeholder="JZM"
            className={clsx(inputClass, "uppercase tracking-widest")}
          />
        </Field>
      </div>
      <Field label="Password">
        <input name="password" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
      </Field>
      <Field label="Support phone">
        <input name="support_phone" type="tel" placeholder="0712 345 678" className={inputClass} />
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="px-1 text-xs font-bold text-slate-500">M-Pesa</span>
        <input type="hidden" name="shortcode_type" value={kind} />
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <div role="group" aria-label="Shortcode type" className="flex rounded-2xl bg-slate-100 p-1">
            {(["till", "paybill"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={clsx("h-10 rounded-xl px-3.5 text-[13px] font-bold capitalize", kind === k ? "bg-white shadow-soft" : "text-slate-500")}
              >
                {k}
              </button>
            ))}
          </div>
          <input name="shortcode" inputMode="numeric" placeholder="Number" className={inputClass} />
        </div>
      </div>
      {state && !state.ok && <ErrorLine error={state.error} hint={state.hint} />}
      <SubmitButton>Create account</SubmitButton>
      <span className="text-center text-[13px] font-semibold text-slate-500">
        Have an account?{" "}
        <Link href="/login" className="font-bold text-blue-600">
          Sign in
        </Link>
      </span>
    </form>
  );
}
