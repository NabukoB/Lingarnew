import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lingar-gold disabled:opacity-50 disabled:pointer-events-none",
        variant === "primary" && "bg-lingar-gold text-lingar-ink hover:bg-lingar-gold/90",
        variant === "ghost" && "text-lingar-ghost hover:text-lingar-paper hover:bg-lingar-surface2",
        variant === "outline" && "border border-white/20 text-lingar-paper hover:bg-lingar-surface2",
        size === "md" && "h-10 px-5 text-sm",
        size === "sm" && "h-8 px-3 text-xs",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
