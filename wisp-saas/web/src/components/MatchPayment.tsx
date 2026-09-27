"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { matchPayment } from "@/lib/actions";
import { inputClass } from "./forms/fields";

/** Assigns an unmatched Paybill payment to a customer's account ID. */
export function MatchPayment({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-800">
        Match
      </button>
    );
  }
  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await matchPayment(id, account);
        setBusy(false);
        if (!r.ok) return setError(r.error);
        setOpen(false);
        router.refresh();
      }}
    >
      <input
        autoFocus
        value={account}
        onChange={(e) => {
          setAccount(e.target.value.toUpperCase());
          setError(null);
        }}
        placeholder="JZM1042"
        aria-label="Account ID"
        aria-invalid={error ? true : undefined}
        title={error ?? undefined}
        className={inputClass + " h-9 w-28 rounded-xl px-2.5 text-[13px]" + (error ? " ring-2 ring-red-300" : "")}
      />
      <button type="submit" disabled={busy || !account} className="h-9 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white disabled:opacity-50">
        OK
      </button>
    </form>
  );
}
