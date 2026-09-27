"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import * as React from "react";
import { cn } from "@/lib/utils";

const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(
  ({ className, ...props }, ref) => <LabelPrimitive.Root ref={ref} className={cn("px-1 text-xs font-bold text-muted-foreground", className)} {...props} />,
);
Label.displayName = LabelPrimitive.Root.displayName;

/** Label + control stacked, with an optional one-line error. */
function Field({ label, htmlFor, error, className, children }: { label: string; htmlFor?: string; error?: string | null; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && (
        <span role="alert" className="px-1 text-[13px] font-semibold text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}

export { Field, Label };
