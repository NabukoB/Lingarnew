"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

/** A modal sheet: bottom sheet on phones, centred card on desktop. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 sm:items-center">
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-[460px] flex-col gap-4 overflow-y-auto rounded-t-card bg-ground p-5 shadow-float sm:rounded-card">
        <div className="flex items-center">
          <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-soft">
            <X aria-hidden size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
