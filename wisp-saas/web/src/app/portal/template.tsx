"use client";

import { m } from "@/components/motion";

export default function PortalTemplate({ children }: { children: React.ReactNode }) {
  return (
    <m.div className="flex flex-grow flex-col" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </m.div>
  );
}
