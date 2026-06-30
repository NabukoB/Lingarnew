export const CATEGORIES = [
  "Bath",
  "Decor",
  "Furniture",
  "Kitchen",
  "Lighting",
  "Office",
  "Outdoor",
  "Storage",
  "Textiles",
  "Wall Art",
] as const;

export function isValidCategory(value: string): value is (typeof CATEGORIES)[number] {
  return (CATEGORIES as readonly string[]).includes(value);
}
