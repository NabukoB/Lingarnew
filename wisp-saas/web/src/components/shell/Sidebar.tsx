"use client";

import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { m } from "@/components/motion";
import { useIntentPrefetch } from "@/hooks/use-intent-prefetch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { activeHref, sidebarNav, type Badges } from "./nav";

export function Sidebar({
  business,
  initials,
  trialDaysLeft,
  badges = {},
  lapsed = false,
}: {
  business: string;
  initials: string;
  trialDaysLeft: number | null;
  badges?: Badges;
  lapsed?: boolean;
}) {
  const pathname = usePathname();
  const intent = useIntentPrefetch();
  const current = activeHref(pathname, sidebarNav);
  return (
    <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col gap-7 px-4 py-6 print:hidden lg:flex">
      <Logo />
      <nav aria-label="Main" className="flex flex-col gap-1 text-sm font-bold">
        {sidebarNav.map(({ label, href, icon: Icon }) => {
          const active = current === href;
          const badge = badges[label];
          return (
            <Link
              key={href}
              href={href}
              {...intent(href)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex h-[46px] items-center gap-3 rounded-[14px] px-3.5 transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && <m.span layoutId="sidebar-active" className="absolute inset-0 rounded-[14px] bg-card shadow-card" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
              <Icon aria-hidden size={20} strokeWidth={2} className="relative transition-transform duration-200 group-hover:scale-110" />
              <span className="relative">{label}</span>
              {badge && (
                <Badge variant={badge.tone === "red" ? "danger" : "warning"} className="relative ml-auto">
                  {badge.text}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-2">
        {(trialDaysLeft !== null || lapsed) && (
          <div className="flex items-center gap-2.5 rounded-tile bg-card p-4 shadow-card">
            <div className="flex flex-grow flex-col">
              <span className={cn("text-[13px] font-extrabold", lapsed && "text-destructive")}>{lapsed ? "Expired" : "Trial"}</span>
              <span className="text-xs font-semibold text-muted-foreground">{lapsed ? "Top up" : `${trialDaysLeft} days left`}</span>
            </div>
            <Button asChild size="sm" className="shadow-none">
              <Link href="/settings/billing">Pay</Link>
            </Button>
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-[52px] items-center gap-3 rounded-[14px] px-2.5 text-left transition-colors hover:bg-card data-[state=open]:bg-card data-[state=open]:shadow-card">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-grow truncate text-sm font-bold">{business}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-[200px]">
            <DropdownMenuLabel className="truncate">{business}</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings aria-hidden /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void logout()} className="text-destructive data-[highlighted]:bg-red-50 data-[highlighted]:text-destructive">
              <LogOut aria-hidden /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
