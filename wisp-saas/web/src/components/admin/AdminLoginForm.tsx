"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { m } from "@/components/motion";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { adminLogin } from "@/lib/admin-actions";
import type { ActionResult } from "@/lib/types";

export function AdminLoginForm({ expired }: { expired: boolean }) {
  const [state, action] = useFormState<ActionResult | null, FormData>(adminLogin, null);
  const error = state && !state.ok ? state : expired ? { error: "Session ended. Sign in again.", hint: undefined } : null;
  return (
    <form action={action} className="flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Staff sign in</h1>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="Authenticator code" htmlFor="code">
        <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} placeholder="123 456" required className="tabular tracking-[0.3em]" />
      </Field>
      {error && (
        <m.div key={error.error} role="alert" initial={{ x: -6 }} animate={{ x: [6, -4, 2, 0] }} transition={{ duration: 0.3 }} className="flex flex-col gap-0.5 rounded-2xl bg-red-50 px-4 py-2.5 text-[13px]">
          <span className="font-bold text-red-700">{error.error}</span>
          {error.hint && <span className="font-semibold text-red-600/80">{error.hint}</span>}
        </m.div>
      )}
      <SubmitButton>Sign in</SubmitButton>
    </form>
  );
}
