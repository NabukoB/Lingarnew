"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const NAV = [
  {
    href: "/digest",
    label: "Brief",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#C9A050" : "#9CA3AF"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="7" x2="16" y2="7" />
        <line x1="8" y1="11" x2="16" y2="11" />
        <line x1="8" y1="15" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    href: "/graph",
    label: "Memory",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#C9A050" : "#9CA3AF"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a5 5 0 0 1 5 5c0 1.5-.5 2.8-1.4 3.8A4 4 0 0 1 16 14c0 2.2-1.8 4-4 4s-4-1.8-4-4a4 4 0 0 1 .4-3.2A5 5 0 0 1 7 7a5 5 0 0 1 5-5z" />
        <path d="M8 14c-1.5.5-2.5 1.5-3 3" />
        <path d="M16 14c1.5.5 2.5 1.5 3 3" />
        <circle cx="12" cy="19" r="1" fill={active ? "#C9A050" : "#9CA3AF"} stroke="none" />
      </svg>
    ),
  },
  {
    href: "/synthesis",
    label: "Notes",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#C9A050" : "#9CA3AF"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    href: "/onboarding",
    label: "Profile",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#C9A050" : "#9CA3AF"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-lingar-surface border-t border-white/10 flex items-stretch justify-around px-2"
      style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
    >
      {NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            className="flex flex-col items-center gap-1 pt-3 pb-2 px-3 min-w-[56px] relative"
          >
            {active && (
              <span className="absolute top-0 left-4 right-4 h-[2px] rounded-full bg-lingar-gold" />
            )}
            {item.icon(active)}
            <span
              className={cn(
                "text-[10px] font-medium",
                active ? "text-lingar-gold" : "text-lingar-ghost"
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
