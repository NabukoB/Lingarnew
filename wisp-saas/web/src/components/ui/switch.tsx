"use client";

import * as SwitchPrimitives from "@radix-ui/react-switch";
import * as React from "react";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitives.Root>, React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>>(
  ({ className, ...props }, ref) => (
    <SwitchPrimitives.Root
      ref={ref}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitives.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-[cubic-bezier(.34,1.56,.64,1)] data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-0.5" />
    </SwitchPrimitives.Root>
  ),
);
Switch.displayName = SwitchPrimitives.Root.displayName;

/** A whole-row toggle: label on the left, switch on the right. */
function SwitchRow({ label, checked, onCheckedChange, id }: { label: string; checked: boolean; onCheckedChange: (v: boolean) => void; id: string }) {
  return (
    <label htmlFor={id} className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-2xl bg-muted/60 px-4 py-2.5 transition-colors hover:bg-muted">
      <span className="flex-grow text-sm font-bold">{label}</span>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

export { Switch, SwitchRow };
