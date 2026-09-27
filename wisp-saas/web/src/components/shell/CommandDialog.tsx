"use client";

import { Plus, Router, Ticket, User, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { searchAll, type SearchHit } from "@/lib/actions";
import { sidebarNav } from "./nav";

const actions = [
  { label: "Add customer", href: "/customers?new=1", icon: UserPlus },
  { label: "Add router", href: "/routers/new", icon: Plus },
  { label: "New voucher batch", href: "/vouchers?new=1", icon: Ticket },
];

export function CommandDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: string;
}) {
  const router = useRouter();
  const [q, setQ] = React.useState(initial);
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) setQ(initial);
  }, [open, initial]);

  React.useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    let live = true;
    setBusy(true);
    const t = setTimeout(async () => {
      const r = await searchAll(q);
      if (live) {
        setHits(r);
        setBusy(false);
      }
    }, 180);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);

  const go = (href: string) => {
    onOpenChange(false);
    setQ("");
    router.push(href);
  };

  const customers = hits.filter((h) => h.kind === "customer");
  const routers = hits.filter((h) => h.kind === "router");
  const t = q.trim().toLowerCase();
  const matchedActions = actions.filter((a) =>
    a.label.toLowerCase().includes(t),
  );
  const matchedPages = sidebarNav.filter((p) =>
    p.label.toLowerCase().includes(t),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[14vh] max-w-[560px] translate-y-0 gap-0 overflow-hidden p-0 [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">
          Pages, actions, customers and routers
        </DialogDescription>
        <Command shouldFilter={false} className="rounded-none bg-card">
          <CommandInput
            placeholder="Search customers, routers, pages…"
            value={q}
            onValueChange={setQ}
          />
          <CommandList>
            {t.length >= 2 && !busy && hits.length === 0 && (
              <CommandEmpty>No matches</CommandEmpty>
            )}
            {customers.length > 0 && (
              <CommandGroup heading="Customers">
                {customers.map((h) => (
                  <CommandItem
                    key={h.id}
                    value={"c" + h.id}
                    onSelect={() => go(h.href)}
                  >
                    <User aria-hidden />
                    <span className="flex-grow truncate">{h.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {h.subtitle}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {routers.length > 0 && (
              <CommandGroup heading="Routers">
                {routers.map((h) => (
                  <CommandItem
                    key={h.id}
                    value={"r" + h.id}
                    onSelect={() => go(h.href)}
                  >
                    <Router aria-hidden />
                    <span className="flex-grow truncate">{h.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {h.subtitle}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {matchedActions.length > 0 && (
              <CommandGroup heading="Actions">
                {matchedActions.map(({ label, href, icon: Icon }) => (
                  <CommandItem
                    key={href}
                    value={"a" + href}
                    onSelect={() => go(href)}
                  >
                    <Icon aria-hidden />
                    {label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {matchedPages.length > 0 && (
              <CommandGroup heading="Pages">
                {matchedPages.map(({ label, href, icon: Icon }) => (
                  <CommandItem
                    key={href}
                    value={"p" + href}
                    onSelect={() => go(href)}
                  >
                    <Icon aria-hidden />
                    {label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
