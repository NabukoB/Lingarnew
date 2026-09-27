"use client";

import Link from "next/link";
import * as React from "react";
import { m } from "@/components/motion";
import { useIntentPrefetch } from "@/hooks/use-intent-prefetch";
import { cn } from "@/lib/utils";

type Item = { value: string; label: React.ReactNode; href?: string; icon?: import("lucide-react").LucideIcon };

/**
 * Pill segmented control. The active pill slides between options
 * (framer-motion shared layout). Items with href render as links.
 */
export function Segmented({
  items,
  value,
  onValueChange,
  label,
  id,
  className,
  size = "sm",
  tone = "primary",
}: {
  items: Item[];
  value: string;
  onValueChange?: (v: string) => void;
  label: string;
  /** Unique per page, so two controls don't share an indicator. */
  id: string;
  className?: string;
  size?: "sm" | "md" | "tabs";
  tone?: "primary" | "white" | "brand";
}) {
  const intent = useIntentPrefetch();
  const pill = tone === "white" ? "bg-card shadow-soft" : tone === "brand" ? "bg-brand shadow-brand" : "bg-primary shadow-brand";
  const on = tone === "white" ? "text-foreground" : "text-white";
  return (
    <div role="tablist" aria-label={label} className={cn("relative flex rounded-2xl bg-card p-1 shadow-soft", tone === "white" && "bg-slate-100 shadow-none", className)}>
      {items.map((it) => {
        const active = it.value === value;
        const Icon = it.icon;
        const inner = (
          <>
            {active && <m.span layoutId={`seg-${id}`} className={cn("absolute inset-0 rounded-xl", pill)} transition={{ type: "spring", stiffness: 520, damping: 40 }} />}
            <span className={cn("relative z-10 flex items-center gap-1.5", size === "tabs" && "flex-col gap-1")}>
              {Icon && <Icon aria-hidden className={size === "tabs" ? "h-[18px] w-[18px]" : "h-4 w-4"} />}
              {it.label}
            </span>
          </>
        );
        const cls = cn(
          "relative flex flex-1 items-center justify-center whitespace-nowrap rounded-xl font-bold transition-colors",
          size === "sm" && "h-9 px-3.5 text-[13px]",
          size === "md" && "h-10 px-4 text-sm",
          size === "tabs" && "py-2.5 text-[11px]",
          active ? on : "text-muted-foreground hover:text-foreground",
        );
        return it.href ? (
          <Link key={it.value} href={it.href} {...intent(it.href)} role="tab" aria-selected={active} aria-current={active ? "page" : undefined} className={cls}>
            {inner}
          </Link>
        ) : (
          <button key={it.value} type="button" role="tab" aria-selected={active} onClick={() => onValueChange?.(it.value)} className={cls}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}
