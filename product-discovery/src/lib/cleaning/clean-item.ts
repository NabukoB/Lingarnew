import type { RawItem } from "../../types/raw-item.ts";
import type { CleanedItem } from "../../types/item.ts";
import { cleanTitle } from "./text.ts";
import { coercePrice } from "./price.ts";
import { isValidCategory } from "./constants.ts";

export function cleanItem(raw: RawItem): CleanedItem {
  const { display: title, search: titleSearch } = cleanTitle(raw.title);
  const brand = raw.brand.trim();
  const brandSearch = brand.toLowerCase();

  const category = isValidCategory(raw.category) ? raw.category : "Decor";

  const tags = raw.tags;
  const tagsSearch = raw.tags.map((tag) => tag.toLowerCase());

  const price = coercePrice(raw.price);
  const hasPrice = price !== null;

  const hasImage = raw.image !== null && raw.imageWidth !== null && raw.imageHeight !== null;
  const image = hasImage ? raw.image : null;
  const imageWidth = hasImage ? raw.imageWidth : null;
  const imageHeight = hasImage ? raw.imageHeight : null;
  const aspectRatio = hasImage && imageWidth && imageHeight ? imageWidth / imageHeight : null;

  const trimmedDescription = raw.description?.trim();
  const description = trimmedDescription ? trimmedDescription : null;

  return {
    id: raw.id,
    title,
    titleSearch,
    brand,
    brandSearch,
    category,
    tags,
    tagsSearch,
    price,
    hasPrice,
    rating: raw.rating,
    reviews: raw.reviews,
    inStock: raw.inStock,
    releasedAt: raw.releasedAt,
    image,
    imageWidth,
    imageHeight,
    aspectRatio,
    description,
  };
}
