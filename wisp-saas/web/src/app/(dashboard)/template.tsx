"use client";

import { m } from "@/components/motion";

/** Re-mounts on every navigation: a quick fade-and-rise between pages. */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return (
    <m.div className="flex flex-col gap-4 lg:gap-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </m.div>
  );
}
