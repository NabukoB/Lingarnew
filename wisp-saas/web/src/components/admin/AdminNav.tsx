"use client";

import { usePathname } from "next/navigation";
import { Segmented } from "@/components/ui/segmented";

const items = [
  { value: "/admin", label: "Overview", href: "/admin" },
  { value: "/admin/tenants", label: "ISPs", href: "/admin/tenants" },
  { value: "/admin/audit", label: "Audit", href: "/admin/audit" },
];

export function AdminNav() {
  const path = usePathname();
  const active = items.reduce((best, i) => (path === i.value || path.startsWith(i.value + "/") ? (i.value.length > best.length ? i.value : best) : best), "/admin");
  return <Segmented id="admin-nav" label="Admin sections" tone="white" items={items} value={active} />;
}
