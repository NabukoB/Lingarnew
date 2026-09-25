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

export type NavItem = {
  label: string;
  href: string | null; // null = not built yet
  icon: LucideIcon;
  badge?: { text: string; tone: "amber" | "red" };
};

export const sidebarNav: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Customers", href: "/customers", icon: Users, badge: { text: "9", tone: "amber" } },
  { label: "Hotspot", href: null, icon: Wifi },
  { label: "Routers", href: "/network", icon: Router, badge: { text: "1", tone: "red" } },
  { label: "Packages", href: null, icon: Package },
  { label: "Money", href: "/money", icon: CreditCard, badge: { text: "1", tone: "amber" } },
  { label: "Vouchers", href: null, icon: Ticket },
  { label: "SMS", href: null, icon: MessageSquare },
  { label: "Settings", href: null, icon: Settings },
];

export const bottomNav: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Money", href: "/money", icon: CreditCard },
  { label: "Network", href: "/network", icon: Wifi },
  { label: "Customers", href: "/customers", icon: Users },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
