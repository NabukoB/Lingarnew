"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { isActive, sidebarNav } from "./nav";

export function Sidebar({ trialDaysLeft }: { trialDaysLeft: number | null }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col gap-7 px-4 py-6 lg:flex">
      <Logo />
      <nav aria-label="Main" className="flex flex-col gap-1 text-sm font-bold">
        {sidebarNav.map(({ label, href, icon: Icon, badge }) => {
          const active = href !== null && isActive(pathname, href);
          const inner = (
            <>
              <Icon aria-hidden size={20} strokeWidth={2} />
              {label}
              {badge && (
                <span
                  className={clsx(
                    "ml-auto rounded-full px-2 py-0.5 text-[11px] font-extrabold",
                    badge.tone === "red" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800",
                  )}
                >
                  {badge.text}
                </span>
              )}
            </>
          );
          const cls = clsx(
            "flex h-[46px] items-center gap-3 rounded-[14px] px-3.5 transition-colors",
            active ? "bg-white text-blue-600 shadow-card" : "text-slate-500 hover:text-slate-900",
          );
          return href === null ? (
            <span key={label} aria-disabled className={clsx(cls, "cursor-not-allowed opacity-50")} title="Coming soon">
              {inner}
            </span>
          ) : (
            <Link key={label} href={href} aria-current={active ? "page" : undefined} className={cls}>
              {inner}
            </Link>
          );
        })}
      </nav>
      {trialDaysLeft !== null && (
        <div className="mt-auto flex items-center gap-2.5 rounded-tile bg-white p-4 shadow-card">
          <div className="flex flex-grow flex-col">
            <span className="text-[13px] font-extrabold">Trial</span>
            <span className="text-xs font-semibold text-slate-500">{trialDaysLeft} days left</span>
          </div>
          <button
            type="button"
            className="flex h-9 items-center rounded-xl bg-blue-600 px-3.5 text-[13px] font-extrabold text-white hover:bg-blue-700"
          >
            Pay
          </button>
        </div>
      )}
    </aside>
  );
}
