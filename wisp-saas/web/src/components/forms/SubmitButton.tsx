"use client";

import { useFormStatus } from "react-dom";
import { primaryClass } from "./fields";

export function SubmitButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className ?? primaryClass}>
      {pending ? "…" : children}
    </button>
  );
}
