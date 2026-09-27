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

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/packages" && pathname.startsWith("/packages/hotspot")) return false;
  if (href === "/settings" && pathname.startsWith("/settings/sms")) return false;
  return pathname === href || pathname.startsWith(href + "/");
}
