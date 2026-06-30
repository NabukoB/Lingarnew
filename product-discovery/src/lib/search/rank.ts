import type { CleanedItem } from "@/types/item";
import type { MatchKind } from "@/lib/search/match";

export interface RankedEntry {
  item: CleanedItem;
  matchKind: MatchKind;
}

export function compareItems(a: RankedEntry, b: RankedEntry): number {
  const rankA = a.matchKind === "title" ? 0 : 1;
  const rankB = b.matchKind === "title" ? 0 : 1;
  if (rankA !== rankB) return rankA - rankB;

  if (a.item.inStock !== b.item.inStock) return a.item.inStock ? -1 : 1;

  const ratingA = a.item.rating ?? -Infinity;
  const ratingB = b.item.rating ?? -Infinity;
  if (ratingA !== ratingB) return ratingB - ratingA;

  return 0;
}
