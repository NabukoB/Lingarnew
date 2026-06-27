import { cn } from "@/lib/utils/cn";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "green" | "amber" | "gray" | "blue" | "red";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variant === "default" && "bg-lingar-surface2 text-lingar-ghost",
        variant === "green" && "bg-emerald-900/60 text-emerald-300",
        variant === "amber" && "bg-amber-900/60 text-amber-300",
        variant === "gray" && "bg-lingar-surface2 text-lingar-ghost",
        variant === "blue" && "bg-blue-900/60 text-blue-300",
        variant === "red" && "bg-red-900/60 text-red-300",
        className
      )}
    >
      {children}
    </span>
  );
}
