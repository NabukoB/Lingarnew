"use client";

import { CATEGORIES } from "@/lib/cleaning/constants";
import { PRICE_BUCKETS } from "@/lib/search/price-buckets";
import { cn } from "@/lib/utils/cn";
import type { ActiveFilters } from "@/types/filters";
import type { Category } from "@/types/item";

const NAV_LINKS = [
  { label: "Home", icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" },
  { label: "Shop All", icon: "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0" },
  { label: "New Arrivals", icon: "M5 3l14 9-14 9V3z" },
  { label: "Best Sellers", icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
  { label: "Brands", icon: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01" },
  { label: "Collections", icon: "M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10" },
  { label: "Makers", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" },
  { label: "Wishlist", icon: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" },
];

function NavIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function SideNav({ filters, onChange }: { filters: ActiveFilters; onChange: (f: ActiveFilters) => void }) {
  return (
    <aside className="sticky top-[65px] hidden h-[calc(100vh-65px)] w-56 shrink-0 overflow-y-auto pb-8 lg:block">
      <nav className="flex flex-col gap-0.5 pt-2">
        {NAV_LINKS.map(({ label, icon }, i) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              if (label === "Home") onChange({ category: null, priceBucket: null, inStockOnly: false });
            }}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              i === 0
                ? "bg-primary-50 text-primary"
                : "text-ink-700 hover:bg-primary-50 hover:text-primary"
            )}
          >
            <NavIcon d={icon} />
            {label}
          </button>
        ))}
      </nav>

      {/* Category filter */}
      <div className="mt-6 border-t border-hairline pt-5">
        <p className="mb-2 px-3 text-[10.5px] font-semibold uppercase tracking-[.16em] text-ink-400">
          Categories
        </p>
        <div className="flex flex-col gap-0.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() =>
                onChange({ ...filters, category: filters.category === cat ? null : (cat as Category) })
              }
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors",
                filters.category === cat
                  ? "bg-primary-50 font-semibold text-primary"
                  : "text-ink-700 hover:bg-primary-50 hover:text-primary"
              )}
            >
              {cat}
              {filters.category === cat && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Price filter */}
      <div className="mt-6 border-t border-hairline pt-5">
        <p className="mb-2 px-3 text-[10.5px] font-semibold uppercase tracking-[.16em] text-ink-400">
          Price
        </p>
        <select
          value={filters.priceBucket ?? ""}
          onChange={(e) =>
            onChange({ ...filters, priceBucket: e.target.value ? (e.target.value as ActiveFilters["priceBucket"]) : null })
          }
          className="w-full rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-ink-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-100"
        >
          <option value="">Any price</option>
          {PRICE_BUCKETS.map((b) => (
            <option key={b.id} value={b.id}>{b.label}</option>
          ))}
        </select>
      </div>

      {/* In-stock toggle */}
      <div className="mt-4 px-1">
        <label className="flex cursor-pointer items-center justify-between rounded-xl px-2 py-2">
          <span className="text-sm text-ink-700">In stock only</span>
          <div className="relative">
            <input
              type="checkbox"
              checked={filters.inStockOnly}
              onChange={() => onChange({ ...filters, inStockOnly: !filters.inStockOnly })}
              className="peer sr-only"
            />
            <div className="h-6 w-10 rounded-full border border-hairline bg-ink-200 transition-colors peer-checked:border-primary peer-checked:bg-primary" />
            <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
          </div>
        </label>
      </div>

      {/* Promo card */}
      <div className="mt-8 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-500 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-white/60">
          Special Offer
        </p>
        <p className="mt-1.5 font-display text-lg font-bold leading-tight text-white">
          Summer Collection
        </p>
        <p className="mt-2 text-xs leading-relaxed text-white/70">
          Fresh arrivals from our independent makers.
        </p>
        <button
          type="button"
          className="mt-4 flex items-center gap-1 text-xs font-semibold text-white/90 transition-opacity hover:opacity-80"
        >
          Shop now
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
