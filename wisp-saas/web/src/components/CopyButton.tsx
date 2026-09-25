"use client";

import clsx from "clsx";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({
  text,
  label,
  showLabel = false,
  className,
}: {
  text: string;
  label: string;
  showLabel?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }
  const Icon = copied ? Check : Copy;
  return (
    <button type="button" onClick={copy} aria-label={showLabel ? undefined : label} className={clsx("flex items-center justify-center gap-2", className)}>
      <Icon aria-hidden size={16} strokeWidth={2.2} />
      {showLabel && <span>{copied ? "Copied" : label}</span>}
      <span role="status" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
