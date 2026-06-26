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
        "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lingar-accent disabled:opacity-50 disabled:pointer-events-none",
        variant === "primary" && "bg-lingar-ink text-lingar-paper hover:bg-gray-800",
        variant === "ghost" && "text-lingar-ghost hover:text-lingar-ink hover:bg-gray-100",
        variant === "outline" &&
          "border border-gray-200 text-lingar-ink hover:bg-gray-50",
        size === "md" && "h-10 px-4 text-sm",
        size === "sm" && "h-8 px-3 text-xs",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
