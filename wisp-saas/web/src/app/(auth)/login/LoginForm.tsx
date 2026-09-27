"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { m } from "@/components/motion";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { login } from "@/lib/actions";
import type { ActionResult } from "@/lib/types";

export function LoginForm({ expired }: { expired: boolean }) {
  const [state, action] = useFormState<ActionResult | null, FormData>(login, null);
  const error = state && !state.ok ? state : expired ? { error: "Session ended. Sign in again.", hint: undefined } : null;
  return (
    <form action={action} className="flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Sign in</h1>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {error && (
        <m.div key={error.error} role="alert" initial={{ x: -6 }} animate={{ x: [6, -4, 2, 0] }} transition={{ duration: 0.3 }} className="flex flex-col gap-0.5 rounded-2xl bg-red-50 px-4 py-2.5 text-[13px]">
          <span className="font-bold text-red-700">{error.error}</span>
          {error.hint && <span className="font-semibold text-red-600/80">{error.hint}</span>}
        </m.div>
      )}
      <SubmitButton>Sign in</SubmitButton>
      <span className="text-center text-[13px] font-semibold text-muted-foreground">
        New here?{" "}
        <Link href="/signup" className="font-bold text-primary hover:underline">
          Create account
        </Link>
      </span>
    </form>
  );
}
