"use client";

import { AnimatePresence } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { m } from "@/components/motion";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export function CopyButton({ text, label, showLabel = false, className }: { text: string; label: string; showLabel?: boolean; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Copy failed. Select the text and copy it.");
    }
  }
  return (
    <button type="button" onClick={copy} aria-label={showLabel ? undefined : label} className={cn("flex items-center justify-center gap-2 transition active:scale-95", className)}>
      <AnimatePresence mode="wait" initial={false}>
        <m.span key={copied ? "y" : "n"} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.12 }}>
          {copied ? <Check aria-hidden size={16} strokeWidth={2.6} /> : <Copy aria-hidden size={16} strokeWidth={2.2} />}
        </m.span>
      </AnimatePresence>
      {showLabel && <span>{copied ? "Copied" : label}</span>}
      <span role="status" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
