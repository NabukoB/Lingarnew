"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { ErrorLine, Field, inputClass } from "@/components/forms/fields";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { login } from "@/lib/actions";
import type { ActionResult } from "@/lib/types";

export function LoginForm({ expired }: { expired: boolean }) {
  const [state, action] = useFormState<ActionResult | null, FormData>(login, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Sign in</h1>
      {expired && !state && <ErrorLine error="Session ended. Sign in again." />}
      <Field label="Email">
        <input name="email" type="email" autoComplete="email" required className={inputClass} />
      </Field>
      <Field label="Password">
        <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      {state && !state.ok && <ErrorLine error={state.error} hint={state.hint} />}
      <SubmitButton>Sign in</SubmitButton>
      <span className="text-center text-[13px] font-semibold text-slate-500">
        New here?{" "}
        <Link href="/signup" className="font-bold text-blue-600">
          Create account
        </Link>
      </span>
    </form>
  );
}
