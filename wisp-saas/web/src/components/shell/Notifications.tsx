"use client";

import { Bell, CheckCircle2, CreditCard, MessageSquare, Router, Users } from "lucide-react";
import Link from "next/link";
import { m } from "@/components/motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type Alert = { key: string; text: string; href: string; tone: "red" | "amber" };

const icons: Record<string, typeof Bell> = { routers: Router, unmatched: CreditCard, sms: MessageSquare, renewals: Users };

/** The bell: real alerts only (offline routers, unmatched payments, SMS credit, renewals). */
export function Notifications({ alerts }: { alerts: Alert[] }) {
  const urgent = alerts.some((a) => a.tone === "red");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={alerts.length ? `Notifications, ${alerts.length}` : "Notifications"}
        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-card shadow-soft transition hover:shadow-card active:scale-95 data-[state=open]:shadow-card"
      >
        <Bell aria-hidden size={19} />
        {alerts.length > 0 && (
          <m.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute right-3 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-card ${urgent ? "bg-red-500" : "bg-amber-500"}`}
          />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px]">
        <DropdownMenuLabel>Alerts</DropdownMenuLabel>
        {alerts.length === 0 && (
          <div className="flex items-center gap-2.5 px-3 py-3 text-sm font-semibold text-muted-foreground">
            <CheckCircle2 aria-hidden className="h-4 w-4 text-green-600" />
            All good
          </div>
        )}
        {alerts.map((a) => {
          const Icon = icons[a.key] ?? Bell;
          return (
            <DropdownMenuItem key={a.key} asChild>
              <Link href={a.href} className="h-auto min-h-11 py-2">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${a.tone === "red" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                  <Icon aria-hidden />
                </span>
                <span className="text-[13px] font-bold">{a.text}</span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
