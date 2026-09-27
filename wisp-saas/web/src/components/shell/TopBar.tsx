"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Tenant } from "@/lib/types";
import { SearchButton } from "./CommandPalette";
import { Notifications, type Alert } from "./Notifications";

function greeting(h: number): string {
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Home header: avatar + greeting, search, alerts. */
export function TopBar({ tenant, alerts }: { tenant: Tenant; alerts: Alert[] }) {
  // Greeting uses the viewer's clock; render after mount to avoid a hydration mismatch.
  const [hello, setHello] = useState("Welcome");
  useEffect(() => setHello(greeting(new Date().getHours())), []);
  return (
    <header className="flex h-[52px] items-center gap-3">
      <Avatar>
        <AvatarFallback>{tenant.initials}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="text-[13px] font-semibold text-muted-foreground">{hello}</span>
        <h1 className="truncate text-lg font-extrabold tracking-tight lg:text-[22px]">{tenant.name}</h1>
      </div>
      <div className="ml-auto flex items-center gap-2.5">
        <SearchButton />
        <Notifications alerts={alerts} />
      </div>
    </header>
  );
}
