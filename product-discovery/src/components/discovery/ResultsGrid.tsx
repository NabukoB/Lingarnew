import type { CleanedItem } from "@/types/item";
import { ProductCard } from "@/components/product/ProductCard";

const RESULT_CAP = 60;

export function ResultsGrid({ items }: { items: CleanedItem[] }) {
  const capped = items.slice(0, RESULT_CAP);

  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {capped.map((item) => (
        <ProductCard key={item.id} item={item} />
      ))}
    </div>
  );
}

export { RESULT_CAP };
