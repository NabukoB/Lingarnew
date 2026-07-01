import type { CleanedItem } from "@/types/item";
import { ProductImage } from "@/components/product/ProductImage";
import { RatingStars } from "@/components/product/RatingStars";
import { StockBadge } from "@/components/product/StockBadge";
import { PriceTag } from "@/components/product/PriceTag";
import { SaveHeart } from "@/components/product/SaveHeart";

export function ProductCard({ item }: { item: CleanedItem }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card bg-surface shadow-card transition-shadow duration-300 hover:shadow-card-up">
      {/* Image area */}
      <div className="relative overflow-hidden">
        <ProductImage item={item} />
        <SaveHeart />
        {!item.inStock && <StockBadge />}

        {/* Add to cart — slides up on hover */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full bg-pine py-3 text-center text-sm font-semibold text-white transition-transform duration-200 motion-reduce:transition-none group-hover:translate-y-0">
          Add to cart
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-[11px] font-semibold uppercase tracking-[.14em] text-ink-400">
          {item.category}
        </span>
        <h3 className="text-base font-semibold leading-snug text-ink-900">{item.title}</h3>
        <p className="text-[13px] text-ink-400">{item.brand}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <PriceTag price={item.price} hasPrice={item.hasPrice} />
          <RatingStars rating={item.rating} reviews={item.reviews} />
        </div>
      </div>
    </article>
  );
}
