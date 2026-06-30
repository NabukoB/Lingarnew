import type { CATEGORIES } from "../lib/cleaning/constants.ts";

export type Category = (typeof CATEGORIES)[number];

export interface CleanedItem {
  id: number;
  title: string;
  titleSearch: string;
  brand: string;
  brandSearch: string;
  category: Category;
  tags: string[];
  tagsSearch: string[];
  price: number | null;
  hasPrice: boolean;
  rating: number | null;
  reviews: number;
  inStock: boolean;
  releasedAt: string;
  image: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  aspectRatio: number | null;
  description: string | null;
}
