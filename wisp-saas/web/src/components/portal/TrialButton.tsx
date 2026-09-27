"use client";

import { AlertCircle, Gift } from "lucide-react";
import { useState } from "react";
import { startTrial } from "@/lib/portal-actions";
import { PrimaryButton } from "./PrimaryButton";

export function TrialButton({ label }: { label: string | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    const r = await startTrial();
    if (r.ok) {
      window.location.href = r.data.next;
      return;
    }
    setError(r.error);
    setBusy(false);
  }

  return (
    <>
      <div className="mt-3 flex flex-col items-center gap-2">
        <span className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-blue-50" style={{ color: "var(--accent)" }}>
          <Gift aria-hidden size={30} strokeWidth={2} />
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight">{label ? `${label} free` : "No free trial"}</h1>
        {label && <span className="text-[13px] font-semibold text-slate-500">Once a day per device</span>}
      </div>
      {error && (
        <div role="alert" className="flex items-center gap-2 self-center rounded-full bg-red-100 px-3 py-2 text-[13px] font-bold text-red-700">
          <AlertCircle aria-hidden size={15} strokeWidth={2.4} />
          {error}
        </div>
      )}
      <div className="mt-auto pb-6 pt-3">
        <PrimaryButton type="button" onClick={go} disabled={!label || busy}>
          {busy ? "…" : "Start free trial"}
        </PrimaryButton>
      </div>
    </>
  );
}
