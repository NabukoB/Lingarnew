"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { m } from "@/components/motion";
import { useIntentPrefetch } from "@/hooks/use-intent-prefetch";
import { cn } from "@/lib/utils";
import { activeHref, bottomNav } from "./nav";

/** Floating tab bar for the phone layout (below lg). */
export function BottomTabs() {
  const pathname = usePathname();
  const intent = useIntentPrefetch();
  const current = activeHref(pathname, bottomNav);
  return (
    <nav
      aria-label="App sections"
      className="fixed inset-x-4 bottom-4 z-30 grid h-[66px] grid-cols-4 rounded-3xl bg-card/95 p-1.5 shadow-float backdrop-blur print:hidden lg:hidden"
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {bottomNav.map(({ label, href, icon: Icon }) => {
        const active = current === href;
        return (
          <Link
            key={href}
            href={href}
            {...intent(href)}
            aria-current={active ? "page" : undefined}
            className={cn("relative flex flex-col items-center justify-center gap-0.5 rounded-[20px] text-[11px] transition-colors", active ? "font-extrabold text-primary" : "font-bold text-slate-400")}
          >
            {active && <m.span layoutId="tab-active" className="absolute inset-0 rounded-[20px] bg-accent" transition={{ type: "spring", stiffness: 520, damping: 40 }} />}
            <m.span className="relative" animate={{ y: active ? -1 : 0, scale: active ? 1.08 : 1 }}>
              <Icon aria-hidden size={22} strokeWidth={active ? 2.3 : 2} />
            </m.span>
            <span className="relative">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
