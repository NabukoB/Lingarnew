import type { Category } from "@/types/item";
import type { PriceBucketId } from "@/lib/search/price-buckets";

export interface ActiveFilters {
  category: Category | null;
  priceBucket: PriceBucketId | null;
  inStockOnly: boolean;
}

export const DEFAULT_FILTERS: ActiveFilters = {
  category: null,
  priceBucket: null,
  inStockOnly: false,
};
