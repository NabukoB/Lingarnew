"use client";

import { Toaster as Sonner, toast } from "sonner";

function Toaster() {
  return (
    <Sonner
      position="top-center"
      offset={16}
      toastOptions={{
        classNames: {
          toast: "rounded-2xl border-0 bg-card font-sans text-sm font-bold shadow-float",
          description: "text-muted-foreground font-semibold",
          success: "text-green-700",
          error: "text-red-700",
        },
      }}
    />
  );
}

export { toast, Toaster };
