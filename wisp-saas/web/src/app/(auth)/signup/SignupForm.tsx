"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { m } from "@/components/motion";
import { Input } from "@/components/ui/input";
import { Field, Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { prefixSuggestions, signup } from "@/lib/actions";
import type { ActionResult } from "@/lib/types";

export function SignupForm() {
  const [state, action] = useFormState<ActionResult | null, FormData>(signup, null);
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [touched, setTouched] = useState(false);
  const [kind, setKind] = useState("till");

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
      <Field label="Business name" htmlFor="business_name">
        <Input id="business_name" name="business_name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jazmoge WiFi" />
      </Field>
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Account prefix" htmlFor="account_prefix">
          <Input
            id="account_prefix"
            // Only a prefix the user typed is sent; otherwise the server picks a free one.
            name={touched ? "account_prefix" : undefined}
            value={prefix}
            onChange={(e) => {
              setTouched(true);
              setPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4));
            }}
            placeholder="JZM"
            className="uppercase tracking-widest"
          />
        </Field>
      </div>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Support phone" htmlFor="support_phone">
        <Input id="support_phone" name="support_phone" type="tel" placeholder="0712 345 678" />
      </Field>
      <div className="flex flex-col gap-1.5">
        <Label>M-Pesa</Label>
        <input type="hidden" name="shortcode_type" value={kind} />
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <Segmented
            id="signup-kind"
            label="Shortcode type"
            tone="white"
            size="md"
            className="h-12 items-center"
            value={kind}
            onValueChange={setKind}
            items={[
              { value: "till", label: "Till" },
              { value: "paybill", label: "Paybill" },
            ]}
          />
          <Input name="shortcode" aria-label="Till or Paybill number" inputMode="numeric" placeholder="Number" />
        </div>
      </div>
      {state && !state.ok && (
        <m.div key={state.error} role="alert" animate={{ x: [6, -4, 2, 0] }} transition={{ duration: 0.3 }} className="flex flex-col gap-0.5 rounded-2xl bg-red-50 px-4 py-2.5 text-[13px]">
          <span className="font-bold text-red-700">{state.error}</span>
          {state.hint && <span className="font-semibold text-red-600/80">{state.hint}</span>}
        </m.div>
      )}
      <SubmitButton>Create account</SubmitButton>
      <span className="text-center text-[13px] font-semibold text-muted-foreground">
        Have an account?{" "}
        <Link href="/login" className="font-bold text-primary hover:underline">
          Sign in
        </Link>
      </span>
    </form>
  );
}
