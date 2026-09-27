"use client";

import { Router, Search, Ticket, UserPlus } from "lucide-react";
import Link from "next/link";
import { m, Stagger, StaggerItem } from "@/components/motion";
import { useCommandPalette } from "@/components/shell/CommandPalette";

const links = [
  { label: "Customer", href: "/customers?new=1", icon: UserPlus },
  { label: "Vouchers", href: "/vouchers?new=1", icon: Ticket },
  { label: "Router", href: "/routers/new", icon: Router },
];

const circle = "flex h-[54px] w-[54px] items-center justify-center rounded-[18px] bg-accent text-primary transition-colors group-hover:bg-blue-100";

export function QuickActions() {
  const { open } = useCommandPalette();
  return (
    <Stagger as="section" className="grid flex-grow grid-cols-4 items-center rounded-tile bg-card px-2.5 py-4 shadow-card">
      {links.map(({ label, href, icon: Icon }) => (
        <StaggerItem key={label}>
          <Link href={href} className="group flex flex-col items-center gap-2 text-xs font-bold text-slate-700">
            <m.span whileHover={{ y: -3 }} whileTap={{ scale: 0.9 }} className={circle}>
              <Icon aria-hidden size={22} strokeWidth={2} />
            </m.span>
            {label}
          </Link>
        </StaggerItem>
      ))}
      <StaggerItem>
        <button type="button" onClick={() => open()} className="group flex w-full flex-col items-center gap-2 text-xs font-bold text-slate-700">
          <m.span whileHover={{ y: -3 }} whileTap={{ scale: 0.9 }} className={circle}>
            <Search aria-hidden size={22} strokeWidth={2} />
          </m.span>
          Find
        </button>
      </StaggerItem>
    </Stagger>
  );
}
