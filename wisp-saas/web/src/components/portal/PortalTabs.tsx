"use client";

import { Gift, RefreshCw, ShoppingBag, Ticket } from "lucide-react";
import { usePathname } from "next/navigation";
import { Segmented } from "@/components/ui/segmented";

const tabs = [
  { value: "/portal/trial", label: "Trial", href: "/portal/trial", icon: Gift },
  { value: "/portal", label: "Buy", href: "/portal", icon: ShoppingBag },
  { value: "/portal/voucher", label: "Voucher", href: "/portal/voucher", icon: Ticket },
  { value: "/portal/reconnect", label: "Reconnect", href: "/portal/reconnect", icon: RefreshCw },
];

export function PortalTabs() {
  const pathname = usePathname();
  // On the portal hostname paths have no /portal prefix (middleware rewrite).
  const path = pathname.startsWith("/portal") ? pathname : "/portal" + (pathname === "/" ? "" : pathname);
  return <Segmented id="portal-tabs" label="Get online" tone="brand" size="tabs" className="grid grid-cols-4 rounded-[18px] p-[5px] shadow-card" items={tabs} value={path} />;
}
