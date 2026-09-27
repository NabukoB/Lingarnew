"use client";

import { ArrowUpRight, Search } from "lucide-react";
import { useCommandPalette } from "@/components/shell/CommandPalette";

/** A big search pill that opens ⌘K (replaces the old assistant placeholder). */
export function FindBar({ placeholder = "Find a customer, router or page" }: { placeholder?: string }) {
  const { open } = useCommandPalette();
  return (
    <button
      type="button"
      onClick={() => open()}
      className="group flex w-full items-center gap-3 rounded-card bg-card py-2.5 pl-3 pr-2.5 text-left shadow-card transition-shadow hover:shadow-float active:scale-[0.99]"
    >
      <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-300 via-blue-500 to-blue-700 text-white shadow-brand">
        <Search size={20} strokeWidth={2.4} />
      </span>
      <span className="min-w-0 flex-grow truncate text-[15px] text-muted-foreground">{placeholder}</span>
      <span aria-hidden className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-primary text-white transition-transform group-hover:rotate-45">
        <ArrowUpRight size={18} strokeWidth={2.4} />
      </span>
    </button>
  );
}
