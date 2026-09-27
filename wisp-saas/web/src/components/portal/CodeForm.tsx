"use client";

import { AlertCircle, type LucideIcon } from "lucide-react";
import { useRef, useState } from "react";
import { m } from "@/components/motion";
import { PrimaryButton } from "./PrimaryButton";

/**
 * A single real <input> drawn as letter boxes, so paste, autofill and
 * screen readers all work normally.
 */
export function CodeForm({
  length,
  title,
  hint,
  icon: Icon,
  button,
  buttonIcon: ButtonIcon,
  validate,
  submitCode,
}: {
  length: number;
  title: string;
  hint: string;
  icon: LucideIcon;
  button: string;
  buttonIcon: LucideIcon;
  validate: (code: string) => string | null;
  /** Sends the code; returns an error line or the URL to go to next. */
  submitCode: (code: string) => Promise<{ ok: true; data: { next: string } } | { ok: false; error: string }>;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const chars = Array.from({ length }, (_, i) => code[i] ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate(code);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    const r = await submitCode(code);
    if (r.ok) {
      window.location.href = r.data.next;
      return;
    }
    setError(r.error);
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-grow flex-col gap-5">
      <div className="mt-3 flex flex-col items-center gap-2">
        <span className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-accent text-brand">
          <Icon aria-hidden size={30} strokeWidth={2} />
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        <span className="text-[13px] font-semibold text-muted-foreground">{hint}</span>
      </div>

      <label className="relative block" onClick={() => inputRef.current?.focus()}>
        <span className="sr-only">{title}</span>
        <input
          ref={inputRef}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, length));
            setError(null);
          }}
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={length}
          aria-invalid={error ? true : undefined}
          className="peer absolute inset-0 h-full w-full opacity-0"
        />
        <m.span
          aria-hidden
          className="grid gap-[5px]"
          style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
          animate={error ? { x: [0, 8, -6, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.35 }}
        >
          {chars.map((ch, i) => (
            <span
              key={i}
              className={`flex h-[50px] items-center justify-center rounded-xl bg-card text-[19px] font-extrabold shadow-soft transition-shadow ${
                i === Math.min(code.length, length - 1) ? "peer-focus:ring-2 peer-focus:ring-[var(--brand)]" : ""
              } ${error ? "ring-1 ring-red-300" : ""}`}
            >
              {ch && (
                <m.span key={ch + i} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 600, damping: 25 }}>
                  {ch}
                </m.span>
              )}
            </span>
          ))}
        </m.span>
      </label>

      {error && (
        <m.div role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 self-center rounded-full bg-red-100 px-3 py-2 text-[13px] font-bold text-red-700">
          <AlertCircle aria-hidden size={15} strokeWidth={2.4} />
          {error}
        </m.div>
      )}

      <div className="mt-auto pb-6 pt-3">
        <PrimaryButton type="submit" disabled={code.length !== length} loading={busy}>
          <ButtonIcon aria-hidden size={18} strokeWidth={2.4} />
          {button}
        </PrimaryButton>
      </div>
    </form>
  );
}
