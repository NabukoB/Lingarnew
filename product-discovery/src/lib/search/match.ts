import type { CleanedItem } from "@/types/item";

export type MatchKind = "title" | "tag-or-brand" | "none";

export function matchKind(item: CleanedItem, queryLower: string): MatchKind {
  if (queryLower === "") return "none";

  if (item.titleSearch.includes(queryLower)) return "title";

  const tagHit = item.tagsSearch.some((tag) => tag.includes(queryLower));
  const brandHit = item.brandSearch.includes(queryLower);
  if (tagHit || brandHit) return "tag-or-brand";

  return "none";
}
