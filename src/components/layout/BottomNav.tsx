"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const NAV = [
  {
    href: "/digest",
    label: "Home",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "#5B5BD6" : "none"} stroke={active ? "#5B5BD6" : "#9CA3AF"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    href: "/synthesis",
    label: "Search",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#5B5BD6" : "#9CA3AF"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    href: "/archive",
    label: "Archive",
    icon: (_active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    isCenter: true,
  },
  {
    href: "/archive",
    label: "Sources",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#5B5BD6" : "#9CA3AF"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
  {
    href: "/onboarding",
    label: "Profile",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#5B5BD6" : "#9CA3AF"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 flex items-center justify-around px-2 pb-safe" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
      {NAV.map((item) => {
        const active = pathname.startsWith(item.href) && !item.isCenter;
        if (item.isCenter) {
          return (
            <Link key={item.label} href={item.href} className="flex flex-col items-center -mt-5">
              <span className="w-14 h-14 rounded-full bg-lingar-accent flex items-center justify-center shadow-lg shadow-lingar-accent/30">
                {item.icon(false)}
              </span>
            </Link>
          );
        }
        return (
          <Link key={item.label} href={item.href} className="flex flex-col items-center gap-1 py-3 px-3 min-w-[48px]">
            {item.icon(active)}
            <span className={cn("text-[10px] font-medium", active ? "text-lingar-accent" : "text-gray-400")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
