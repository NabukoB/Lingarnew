"use client";

import clsx from "clsx";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Subscriber, SubscriberStatus } from "@/lib/types";
import { formatKsh } from "@/lib/format";
import { Avatar, SubscriberStatusPill } from "../ui";

type Filter = "all" | SubscriberStatus;

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "grace", label: "In grace" },
  { id: "suspended", label: "Suspended" },
  { id: "cancelled", label: "Cancelled" },
];

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

export function CustomersView({ subscribers, paybill }: { subscribers: Subscriber[]; paybill: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(subscribers[0]?.id ?? null);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: subscribers.length, active: 0, grace: 0, suspended: 0, cancelled: 0 };
    subscribers.forEach((s) => (c[s.status] += 1));
    return c;
  }, [subscribers]);

  const visible = subscribers.filter((s) => {
    if (filter !== "all" && s.status !== filter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.phone.replace(/\s/g, "").includes(q.replace(/\s/g, ""))
    );
  });
  const selected = subscribers.find((s) => s.id === selectedId) ?? null;

  return (
    <>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Customers</h1>
        <div className="ml-auto flex items-center gap-2.5">
          <label className="hidden h-[46px] w-[280px] items-center gap-2.5 rounded-full bg-white px-4 shadow-soft sm:flex">
            <Search aria-hidden size={17} className="text-slate-400" />
            <span className="sr-only">Search customers</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, phone or ID"
              className="min-w-0 flex-grow bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </label>
          <button type="button" className="flex h-[46px] items-center gap-2 rounded-full bg-blue-600 px-5 text-[13px] font-bold text-white shadow-brand hover:bg-blue-700">
            <Plus aria-hidden size={15} strokeWidth={2.6} />
            Add
          </button>
        </div>
      </header>

      <div role="group" aria-label="Filter by status" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={clsx(
              "h-[38px] shrink-0 rounded-full px-4 text-[13px]",
              filter === f.id ? "bg-blue-600 font-bold text-white" : "bg-white font-semibold text-slate-700 shadow-soft",
            )}
          >
            {f.label} · {counts[f.id]}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-grow flex-col gap-4 lg:flex-row">
        <section aria-label="Customer list" className="min-w-0 flex-grow rounded-card bg-white px-3 py-1.5 shadow-card lg:px-5">
          <ul>
            {visible.map((s, i) => (
              <li key={s.id} className={clsx(i > 0 && "border-t border-line")}>
                <button
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  aria-pressed={s.id === selectedId}
                  className={clsx(
                    "flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left",
                    s.id === selectedId ? "bg-blue-50/60" : "hover:bg-slate-50",
                  )}
                >
                  <Avatar initials={initials(s.name)} className="h-9 w-9 text-[11px]" />
                  <div className="flex min-w-0 flex-grow flex-col">
                    <span className="truncate text-sm font-bold">{s.name}</span>
                    <span className="text-xs font-semibold text-blue-600">{s.id}</span>
                  </div>
                  <span className="hidden w-32 text-[13px] text-slate-600 md:block">{s.plan}</span>
                  <span className="tabular hidden w-16 text-[13px] text-slate-600 md:block">{s.renews ?? "—"}</span>
                  <SubscriberStatusPill status={s.status} />
                </button>
              </li>
            ))}
            {visible.length === 0 && <li className="px-2 py-10 text-center text-sm font-semibold text-slate-500">No customers match</li>}
          </ul>
        </section>

        {selected && (
          <aside aria-label="Selected customer" className="flex w-full shrink-0 flex-col gap-4 rounded-card bg-white p-5 shadow-card lg:w-[350px]">
            <div className="flex items-center gap-3">
              <Avatar initials={initials(selected.name)} className="h-12 w-12 text-base" />
              <div className="flex flex-col">
                <h2 className="text-lg font-extrabold tracking-tight">{selected.name}</h2>
                <span className="text-[13px] font-bold text-blue-600">{selected.id}</span>
              </div>
              <span className="ml-auto">
                <SubscriberStatusPill status={selected.status} />
              </span>
            </div>
            <span className="text-[13px] font-semibold text-slate-500">
              {selected.phone} · {selected.online}
            </span>
            <dl className="grid grid-cols-2 gap-2.5">
              {[
                ["Plan", selected.plan],
                ["Price", formatKsh(selected.price) + "/mo"],
                ["Paid until", selected.paidUntil ?? "—"],
                ["Used", selected.usedGb + " GB"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-slate-50 px-3 py-2.5">
                  <dt className="text-[11px] text-slate-500">{k}</dt>
                  <dd className="mt-0.5 text-sm font-bold">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="flex items-center justify-between rounded-2xl bg-blue-50 px-3.5 py-3 text-sm">
              <span className="font-bold text-blue-700">Paybill {paybill}</span>
              <b>{selected.id}</b>
            </div>
            <div className="flex flex-col gap-2">
              <button type="button" className="h-12 rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-brand hover:bg-blue-700">
                Send STK push
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="h-11 rounded-[14px] border border-slate-200 text-[13px] font-semibold text-slate-700">Change plan</button>
                <button type="button" className="h-11 rounded-[14px] border border-slate-200 text-[13px] font-semibold text-slate-700">Show password</button>
              </div>
              <button
                type="button"
                disabled={selected.status === "suspended" || selected.status === "cancelled"}
                className="h-11 rounded-[14px] border border-red-200 text-[13px] font-bold text-red-700 disabled:opacity-40"
              >
                Suspend
              </button>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
