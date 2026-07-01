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
      <h2 className="mb-5 text-[11.5px] font-semibold uppercase tracking-[.16em] text-ink-400">
        Popular
      </h2>
      <div className="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {popular.map((item) => (
          <ProductCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
