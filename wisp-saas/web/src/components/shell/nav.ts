import {
  CreditCard,
  Home,
  MessageSquare,
  Package,
  Router,
  Settings,
  Ticket,
  Users,
  Wifi,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon };

export const sidebarNav: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Routers", href: "/network", icon: Router },
  { label: "Packages", href: "/packages", icon: Package },
  { label: "Hotspot", href: "/packages/hotspot", icon: Wifi },
  { label: "Money", href: "/money", icon: CreditCard },
  { label: "Vouchers", href: "/vouchers", icon: Ticket },
  { label: "SMS", href: "/settings/sms", icon: MessageSquare },
  { label: "Settings", href: "/settings", icon: Settings },
];

export const bottomNav: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Money", href: "/money", icon: CreditCard },
  { label: "Network", href: "/network", icon: Wifi },
  { label: "Customers", href: "/customers", icon: Users },
];

export type Badges = Partial<Record<string, { text: string; tone: "amber" | "red" }>>;

/** Which nav item a path belongs to (most specific wins). */
export function activeHref(pathname: string, items: NavItem[]): string | null {
  let best: string | null = null;
  for (const { href } of items) {
    const hit = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
    if (hit && (!best || href.length > best.length)) best = href;
  }
  if (!best && pathname.startsWith("/routers")) best = items.find((i) => i.href === "/network")?.href ?? null;
  return best;
}
