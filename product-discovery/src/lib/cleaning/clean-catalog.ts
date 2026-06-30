import type { RawItem } from "../../types/raw-item.ts";
import type { CleanedItem } from "../../types/item.ts";
import { cleanItem } from "./clean-item.ts";

export function cleanCatalog(rawItems: RawItem[]): CleanedItem[] {
  return rawItems.map(cleanItem);
}
