"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.16z" />
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.16z" />
      </svg>
    ),
  },
  {
    href: "/add",
    label: "Add",
    icon: (_active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    isCenter: true,
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
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (pathname.startsWith("/digest")) {
      localStorage.setItem("last_digest_seen", today);
      setHasUnread(false);
    } else {
      setHasUnread(localStorage.getItem("last_digest_seen") !== today);
    }
  }, [pathname]);

  if (pathname === "/" || pathname.startsWith("/auth")) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-lingar-surface border-t border-white/10 flex items-stretch justify-around px-2"
      style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
    >
      {NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        if (item.isCenter) {
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 pt-3 pb-2 px-3 min-w-[56px] relative"
            >
              <span className="w-10 h-10 rounded-full bg-lingar-gold flex items-center justify-center shadow-lg">
                {item.icon(active)}
              </span>
            </Link>
          );
        }
        const showBadge = hasUnread && item.href === "/digest";
        return (
          <Link
            key={item.label}
            href={item.href}
            className="flex flex-col items-center gap-1 pt-3 pb-2 px-3 min-w-[56px] relative"
          >
            {active && (
              <span className="absolute top-0 left-4 right-4 h-[2px] rounded-full bg-lingar-gold" />
            )}
            <span className="relative">
              {item.icon(active)}
              {showBadge && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-lingar-gold border border-lingar-surface" />
              )}
            </span>
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
