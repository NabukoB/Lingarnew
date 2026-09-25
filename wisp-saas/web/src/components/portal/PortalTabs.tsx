"use client";

import clsx from "clsx";
import { Gift, RefreshCw, ShoppingBag, Ticket } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Trial", href: "/portal/trial", icon: Gift },
  { label: "Buy", href: "/portal", icon: ShoppingBag },
  { label: "Voucher", href: "/portal/voucher", icon: Ticket },
  { label: "Reconnect", href: "/portal/reconnect", icon: RefreshCw },
];

export function PortalTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Get online" className="grid grid-cols-4 gap-1 rounded-[18px] bg-white p-[5px] shadow-card">
      {tabs.map(({ label, href, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex flex-col items-center gap-1 rounded-[14px] py-2.5 text-[11px] font-bold",
              active ? "text-white" : "text-slate-500",
            )}
            style={active ? { background: "var(--accent)" } : undefined}
          >
            <Icon aria-hidden size={18} strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
