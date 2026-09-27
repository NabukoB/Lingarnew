import * as React from "react";
import { cn } from "@/lib/utils";

export const inputBase =
  "flex h-12 w-full rounded-2xl bg-card px-4 text-[15px] font-semibold shadow-soft outline-none transition-shadow placeholder:font-medium placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/40";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
  <input type={type} ref={ref} className={cn(inputBase, className)} {...props} />
));
Input.displayName = "Input";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(inputBase, "h-auto min-h-[96px] py-3 text-sm leading-relaxed", className)} {...props} />
));
Textarea.displayName = "Textarea";

export { Input, Textarea };
