"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteRouter, syncRouter } from "@/lib/actions";
import { secondaryClass } from "../forms/fields";

export function RouterActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className={secondaryClass}
          onClick={async () => {
            setBusy(true);
            const r = await syncRouter(id);
            setBusy(false);
            setNote(r.ok ? (r.data ? `Fixed ${r.data} setting${r.data > 1 ? "s" : ""}` : "All in sync") : r.error);
            router.refresh();
          }}
        >
          Sync
        </button>
        <button type="button" disabled={busy} className={secondaryClass} onClick={() => router.push(`/routers/${id}?setup=1`)}>
          New setup command
        </button>
        <button
          type="button"
          disabled={busy}
          className={secondaryClass + " text-red-700"}
          onClick={async () => {
            if (!confirm(`Remove ${name}? Its customers lose RADIUS until it is added again.`)) return;
            setBusy(true);
            const r = await deleteRouter(id);
            if (r.ok) router.push("/network");
            else {
              setBusy(false);
              setNote(r.error);
            }
          }}
        >
          Remove
        </button>
      </div>
      {note && <span className="px-1 text-[13px] font-bold text-slate-600">{note}</span>}
    </div>
  );
}
