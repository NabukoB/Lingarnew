import type { CleanedItem } from "@/types/item";
import { ProductImage } from "@/components/product/ProductImage";
import { RatingStars } from "@/components/product/RatingStars";
import { StockBadge } from "@/components/product/StockBadge";
import { PriceTag } from "@/components/product/PriceTag";

export function ProductCard({ item }: { item: CleanedItem }) {
  return (
    <article className="group flex flex-col">
      <div className="relative">
        <ProductImage item={item} />
        {!item.inStock && <StockBadge />}
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-1">
        <span className="text-xs uppercase tracking-wide text-ink-400">{item.category}</span>
        <h3 className="text-sm font-medium text-ink-900">{item.title}</h3>
        <p className="text-xs text-ink-500">{item.brand}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <PriceTag price={item.price} hasPrice={item.hasPrice} />
          <RatingStars rating={item.rating} reviews={item.reviews} />
        </div>
      </div>
    </article>
  );
}
