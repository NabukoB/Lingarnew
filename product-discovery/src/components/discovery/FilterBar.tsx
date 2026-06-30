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
  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={filters.category ?? ""}
        onChange={(e) =>
          onChange({ ...filters, category: e.target.value ? (e.target.value as ActiveFilters["category"]) : null })
        }
        className="rounded-full border border-ink-200 bg-white px-4 py-2 text-sm text-ink-700 focus:border-clay-400 focus:outline-none"
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
        className="rounded-full border border-ink-200 bg-white px-4 py-2 text-sm text-ink-700 focus:border-clay-400 focus:outline-none"
      >
        <option value="">Any price</option>
        {PRICE_BUCKETS.map((bucket) => (
          <option key={bucket.id} value={bucket.id}>
            {bucket.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => onChange({ ...filters, inStockOnly: !filters.inStockOnly })}
        className={cn(
          "rounded-full border px-4 py-2 text-sm transition-colors",
          filters.inStockOnly
            ? "border-clay-500 bg-clay-500 text-white"
            : "border-ink-200 bg-white text-ink-700 hover:border-ink-300"
        )}
      >
        In stock only
      </button>
    </div>
  );
}
