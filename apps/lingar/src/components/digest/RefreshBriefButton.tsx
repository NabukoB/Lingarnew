"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncDigestGhostNotes } from "@/app/digest/[date]/actions";

export function RefreshBriefButton({ date }: { date: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="bg-lingar-surface border border-lingar-gold/20 rounded-2xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-lingar-gold/10 flex items-center justify-center text-lg">
          👻
        </div>
        <div>
          <p className="text-[13px] font-semibold text-lingar-paper">
            {isPending ? "The Ghost is syncing…" : "Ghost Notes ready"}
          </p>
          <p className="text-[11px] text-lingar-ghost">
            {isPending ? "Rebuilding your brief…" : "Tap to add them to your brief"}
          </p>
        </div>
      </div>
      <button
        onClick={() =>
          startTransition(async () => {
            await syncDigestGhostNotes(date);
            router.refresh();
          })
        }
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-lingar-gold/10 border border-lingar-gold/30 text-lingar-gold text-[12px] font-semibold disabled:opacity-50 transition-opacity"
      >
        {isPending ? (
          <span className="animate-spin inline-block w-3 h-3 border border-lingar-gold border-t-transparent rounded-full" />
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
        )}
        {isPending ? "Syncing" : "Sync"}
      </button>
    </div>
  );
}
