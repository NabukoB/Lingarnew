import type { CleanedItem } from "@/types/item";
import type { ActiveFilters } from "@/types/filters";
import { matchKind, type MatchKind } from "@/lib/search/match";
import { priceInBucket } from "@/lib/search/price-buckets";

export interface FilteredEntry {
  item: CleanedItem;
  matchKind: MatchKind;
}

export function filterItems(
  items: CleanedItem[],
  query: string,
  filters: ActiveFilters
): FilteredEntry[] {
  const queryLower = query.trim().toLowerCase();

  return items
    .filter((item) => {
      if (filters.category && item.category !== filters.category) return false;
      if (filters.inStockOnly && !item.inStock) return false;
      if (filters.priceBucket && !priceInBucket(item.price, filters.priceBucket)) return false;
      return true;
    })
    .map((item) => ({ item, matchKind: queryLower ? matchKind(item, queryLower) : ("none" as MatchKind) }))
    .filter((entry) => queryLower === "" || entry.matchKind !== "none");
}
