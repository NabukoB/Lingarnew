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
        variant === "default" && "bg-gray-100 text-gray-700",
        variant === "green" && "bg-emerald-50 text-emerald-700",
        variant === "amber" && "bg-amber-50 text-amber-700",
        variant === "gray" && "bg-gray-50 text-gray-500",
        variant === "blue" && "bg-blue-50 text-blue-700",
        variant === "red" && "bg-red-50 text-red-700",
        className
      )}
    >
      {children}
    </span>
  );
}
