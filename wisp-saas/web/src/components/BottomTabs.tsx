"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { bottomNav, isActive } from "./nav";

export function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="App sections"
      className="fixed inset-x-4 bottom-4 z-20 grid h-[66px] grid-cols-4 rounded-3xl bg-white shadow-float lg:hidden"
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {bottomNav.map(({ label, href, icon: Icon }) => {
        const active = href !== null && isActive(pathname, href);
        return (
          <Link
            key={label}
            href={href ?? "/"}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex flex-col items-center justify-center gap-0.5 text-[11px]",
              active ? "font-extrabold text-blue-600" : "font-bold text-slate-400",
            )}
          >
            <Icon aria-hidden size={22} strokeWidth={active ? 2.2 : 2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
