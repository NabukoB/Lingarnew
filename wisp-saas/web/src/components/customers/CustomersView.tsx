"use client";

import { AnimatePresence } from "framer-motion";
import { Plus, Search, Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, initialsOf, PageHeader, SubscriberStatusPill } from "@/components/bits";
import { m } from "@/components/motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { useMatches } from "@/hooks/use-media-query";
import type { Plan, Subscriber, SubscriberStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AddCustomer } from "./AddCustomer";
import { CustomerDetail } from "./CustomerDetail";

type Filter = "all" | SubscriberStatus;
const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "expired", label: "Expired" },
  { id: "suspended", label: "Suspended" },
  { id: "cancelled", label: "Cancelled" },
];

export function CustomersView({
  subscribers,
  paybill,
  shortcodeType = "paybill",
  plans = [],
}: {
  subscribers: Subscriber[];
  paybill: string;
  shortcodeType?: "till" | "paybill";
  plans?: Plan[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const desktop = useMatches("(min-width: 1024px)");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(params.get("c"));
  const [adding, setAdding] = useState(params.get("new") === "1");
  const pppoePlans = plans.filter((p) => p.accessType === "pppoe" && p.isActive);

  // Deep links (?c=, ?new=1) from search and quick actions.
  useEffect(() => {
    const c = params.get("c");
    if (c) setSelectedId(c);
    if (params.get("new") === "1") setAdding(true);
  }, [params]);

  // Desktop shows a detail panel, so preselect the first customer there only.
  useEffect(() => {
    if (desktop === true && !selectedId && subscribers[0]) setSelectedId(subscribers[0].id);
  }, [desktop, selectedId, subscribers]);

  const clearParams = () => router.replace(pathname, { scroll: false });

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: subscribers.length, active: 0, grace: 0, expired: 0, suspended: 0, cancelled: 0 };
    subscribers.forEach((s) => (c[s.status] += 1));
    return c;
  }, [subscribers]);

  const visible = subscribers.filter((s) => {
    if (filter !== "all" && s.status !== filter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.phone.replace(/\s/g, "").includes(q.replace(/\s/g, ""));
  });
  const selected = subscribers.find((s) => s.id === selectedId) ?? null;
  const detail = selected && <CustomerDetail key={selected.id} subscriber={selected} plans={pppoePlans} paybill={shortcodeType === "paybill" ? paybill : ""} />;

  return (
    <>
      <PageHeader
        title="Customers"
        actions={
          <Button size="pill" onClick={() => setAdding(true)}>
            <Plus aria-hidden size={15} strokeWidth={2.6} />
            Add
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative sm:w-[300px]">
          <Search aria-hidden size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <span className="sr-only">Search customers</span>
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, phone or ID" className="h-[46px] rounded-full pl-11 text-sm" />
        </label>
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Segmented
            id="customer-filter"
            label="Filter by status"
            className="w-max"
            items={filters.map((f) => ({ value: f.id, label: `${f.label} · ${counts[f.id]}` }))}
            value={filter}
            onValueChange={(v) => setFilter(v as Filter)}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-grow flex-col gap-4 lg:flex-row">
        <Card aria-label="Customer list" className="min-w-0 flex-grow px-3 py-1.5 lg:px-4">
          {subscribers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No customers yet"
              action={
                <Button size="sm" onClick={() => setAdding(true)}>
                  Add customer
                </Button>
              }
            />
          ) : (
            <m.ul layout>
              <AnimatePresence initial={false}>
                {visible.map((s) => (
                  <m.li key={s.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }} className="border-b border-line last:border-0">
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      aria-pressed={s.id === selectedId}
                      className={cn("my-1 flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors", s.id === selectedId && desktop ? "bg-accent" : "hover:bg-muted/60")}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-[11px]">{initialsOf(s.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-grow flex-col">
                        <span className="truncate text-sm font-bold">{s.name}</span>
                        <span className="text-xs font-semibold text-primary">{s.id}</span>
                      </div>
                      <span className="hidden w-32 truncate text-[13px] text-slate-600 md:block">{s.plan}</span>
                      <span className="tabular hidden w-16 text-[13px] text-slate-600 md:block">{s.renews ?? "—"}</span>
                      <SubscriberStatusPill status={s.status} />
                    </button>
                  </m.li>
                ))}
              </AnimatePresence>
              {visible.length === 0 && <li className="px-2 py-10 text-center text-sm font-semibold text-muted-foreground">No customers match</li>}
            </m.ul>
          )}
        </Card>

        <AnimatePresence mode="wait">
          {selected && (
            <m.aside
              key={selected.id}
              aria-label="Selected customer"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="sticky top-6 hidden h-fit w-[350px] shrink-0 flex-col gap-4 rounded-card bg-card p-5 shadow-card lg:flex"
            >
              {desktop !== false && detail}
            </m.aside>
          )}
        </AnimatePresence>
        <Modal
          open={desktop === false && !!selected}
          onOpenChange={(o) => {
            if (!o) {
              setSelectedId(null);
              if (params.get("c")) clearParams();
            }
          }}
          title={selected?.name ?? "Customer"}
          hideTitle
        >
          {desktop === false && detail}
        </Modal>
      </div>

      <AddCustomer
        open={adding}
        plans={pppoePlans}
        onOpenChange={(o) => {
          setAdding(o);
          if (!o && params.get("new")) clearParams();
        }}
      />
    </>
  );
}
