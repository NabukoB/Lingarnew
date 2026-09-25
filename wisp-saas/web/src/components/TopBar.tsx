import { Bell, Search } from "lucide-react";
import type { Tenant } from "@/lib/types";
import { Avatar } from "./ui";

function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function TopBar({ tenant, title }: { tenant: Tenant; title?: string }) {
  return (
    <header className="flex h-[52px] items-center gap-3">
      {title ? (
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      ) : (
        <>
          <Avatar initials={tenant.initials} />
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-slate-500">{greeting()}</span>
            <h1 className="text-lg font-extrabold tracking-tight lg:text-[22px]">{tenant.name}</h1>
          </div>
        </>
      )}
      <div className="ml-auto flex items-center gap-2.5">
        <label className="hidden h-[46px] w-[300px] items-center gap-2.5 rounded-full bg-white px-4 shadow-soft lg:flex">
          <Search aria-hidden size={17} className="text-slate-400" />
          <span className="sr-only">Search</span>
          <input
            type="search"
            placeholder="Search"
            className="min-w-0 flex-grow bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          <kbd className="font-sans text-[11px] font-bold text-slate-400">⌘K</kbd>
        </label>
        <button
          type="button"
          aria-label="Notifications, 2 new"
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-soft"
        >
          <Bell aria-hidden size={19} />
          <span className="absolute right-3 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
        </button>
      </div>
    </header>
  );
}
