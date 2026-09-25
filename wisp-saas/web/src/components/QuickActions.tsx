import { Router, Smartphone, Ticket, UserPlus } from "lucide-react";
import Link from "next/link";

const actions = [
  { label: "Customer", href: "/customers", icon: UserPlus },
  { label: "STK push", href: "/customers", icon: Smartphone },
  { label: "Vouchers", href: "/money", icon: Ticket },
  { label: "Router", href: "/routers/new", icon: Router },
];

export function QuickActions() {
  return (
    <nav aria-label="Quick actions" className="grid flex-grow grid-cols-4 items-center rounded-tile bg-white px-2.5 py-4 shadow-card">
      {actions.map(({ label, href, icon: Icon }) => (
        <Link key={label} href={href} className="flex flex-col items-center gap-2 text-xs font-bold text-slate-700">
          <span className="flex h-[54px] w-[54px] items-center justify-center rounded-[18px] bg-blue-50 text-blue-600 transition hover:bg-blue-100">
            <Icon aria-hidden size={22} strokeWidth={2} />
          </span>
          {label}
        </Link>
      ))}
    </nav>
  );
}
