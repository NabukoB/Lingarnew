"use client";

import { CATEGORIES } from "@/lib/cleaning/constants";
import { PRICE_BUCKETS } from "@/lib/search/price-buckets";
import type { ActiveFilters } from "@/types/filters";
import { cn } from "@/lib/utils/cn";

export function FilterBar({
  filters,
  onChange,
}: {
  filters: ActiveFilters;
  onChange: (filters: ActiveFilters) => void;
}) {
  const selectClass = (active: boolean) =>
    cn(
      "rounded-full border px-4 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pine-tint bg-surface",
      active
        ? "border-pine text-pine font-medium"
        : "border-hairline text-ink-700 hover:border-pine"
    );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={filters.category ?? ""}
        onChange={(e) =>
          onChange({ ...filters, category: e.target.value ? (e.target.value as ActiveFilters["category"]) : null })
        }
        className={selectClass(filters.category !== null)}
      >
        <option value="">All categories</option>
        {CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <select
        value={filters.priceBucket ?? ""}
        onChange={(e) =>
          onChange({
            ...filters,
            priceBucket: e.target.value ? (e.target.value as ActiveFilters["priceBucket"]) : null,
          })
        }
        className={selectClass(filters.priceBucket !== null)}
      >
        <option value="">Any price</option>
        {PRICE_BUCKETS.map((bucket) => (
          <option key={bucket.id} value={bucket.id}>
            {bucket.label}
          </option>
        ))}
      </select>

      {/* iOS-style toggle */}
      <label className="flex cursor-pointer items-center gap-2.5">
        <div className="relative">
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={() => onChange({ ...filters, inStockOnly: !filters.inStockOnly })}
            className="peer sr-only"
          />
          <div className="h-6 w-10 rounded-full border border-hairline bg-hairline transition-colors peer-checked:border-pine peer-checked:bg-pine" />
          <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
        </div>
        <span className="text-sm text-ink-700">In stock only</span>
      </label>
    </div>
  );
}
