"use client";

import { useMemo, useState } from "react";
import type { CleanedItem } from "@/types/item";
import type { Category } from "@/types/item";
import { DEFAULT_FILTERS, type ActiveFilters } from "@/types/filters";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { filterItems } from "@/lib/search/filter";
import { compareItems } from "@/lib/search/rank";
import { SearchBar } from "@/components/discovery/SearchBar";
import { FilterBar } from "@/components/discovery/FilterBar";
import { CategoryChips } from "@/components/discovery/CategoryChips";
import { PopularRow } from "@/components/discovery/PopularRow";
import { ResultsGrid, RESULT_CAP } from "@/components/discovery/ResultsGrid";
import { ResultCount } from "@/components/discovery/ResultCount";
import { EmptyState } from "@/components/discovery/EmptyState";

export function CatalogExplorer({ items }: { items: CleanedItem[] }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<ActiveFilters>(DEFAULT_FILTERS);
  const debouncedQuery = useDebouncedValue(query, 300);

  const isDiscoveryView =
    debouncedQuery.trim() === "" &&
    filters.category === null &&
    filters.priceBucket === null &&
    !filters.inStockOnly;

  const results = useMemo(() => {
    const entries = filterItems(items, debouncedQuery, filters);
    return entries.sort(compareItems).map((entry) => entry.item);
  }, [items, debouncedQuery, filters]);

  function handleCategorySelect(category: Category) {
    setFilters((prev) => ({ ...prev, category }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <SearchBar value={query} onChange={setQuery} />
        <FilterBar filters={filters} onChange={setFilters} />
      </div>

      {isDiscoveryView ? (
        <div>
          <CategoryChips onSelect={handleCategorySelect} />
          <PopularRow items={items} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <ResultCount total={results.length} shown={Math.min(results.length, RESULT_CAP)} />
          {results.length === 0 ? (
            <EmptyState query={debouncedQuery} />
          ) : (
            <ResultsGrid items={results} />
          )}
        </div>
      )}
    </div>
  );
}
