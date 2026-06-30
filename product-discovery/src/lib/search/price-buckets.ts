export const PRICE_BUCKETS = [
  { id: "under-25", label: "Under $25", min: 0, max: 25 },
  { id: "25-50", label: "$25 – $50", min: 25, max: 50 },
  { id: "50-100", label: "$50 – $100", min: 50, max: 100 },
  { id: "100-250", label: "$100 – $250", min: 100, max: 250 },
  { id: "250-500", label: "$250 – $500", min: 250, max: 500 },
  { id: "500-plus", label: "$500+", min: 500, max: Infinity },
] as const;

export type PriceBucketId = (typeof PRICE_BUCKETS)[number]["id"];

export function priceInBucket(price: number | null, bucketId: PriceBucketId): boolean {
  if (price === null) return false;
  const bucket = PRICE_BUCKETS.find((b) => b.id === bucketId);
  if (!bucket) return false;
  return price >= bucket.min && price < bucket.max;
}
