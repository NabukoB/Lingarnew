import type { CleanedItem } from "@/types/item";
import { ProductCard } from "@/components/product/ProductCard";

export function PopularRow({ items }: { items: CleanedItem[] }) {
  const popular = items
    .filter((item) => item.inStock)
    .slice()
    .sort((a, b) => b.reviews - a.reviews)
    .slice(0, 12);

  if (popular.length === 0) return null;

  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink-900">Popular Deals</h2>
        <button type="button" className="text-sm font-semibold text-primary transition-opacity hover:opacity-70">
          View All
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {popular.map((item) => (
          <ProductCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
