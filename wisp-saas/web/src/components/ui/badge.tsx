import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-extrabold", {
  variants: {
    variant: {
      default: "bg-accent text-accent-foreground",
      success: "bg-green-100 text-green-700",
      warning: "bg-amber-100 text-amber-800",
      danger: "bg-red-100 text-red-700",
      muted: "bg-slate-100 text-slate-600",
      onDark: "bg-white/20 text-white",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
