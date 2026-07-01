import type { CleanedItem } from "@/types/item";
import { ProductImage } from "@/components/product/ProductImage";
import { RatingStars } from "@/components/product/RatingStars";
import { StockBadge } from "@/components/product/StockBadge";
import { PriceTag } from "@/components/product/PriceTag";
import { SaveHeart } from "@/components/product/SaveHeart";

const SWATCHES = ["#E9E1D2", "#DCE2D7", "#E8DACF", "#DBE0E1", "#EAE1C8"];

function getDiscount(id: number): number {
  if (id % 7 === 0) return 30;
  if (id % 5 === 0) return 25;
  if (id % 3 === 0) return 20;
  return 0;
}

export function ProductCard({ item }: { item: CleanedItem }) {
  const discount = item.inStock ? getDiscount(item.id) : 0;
  const originalPrice =
    discount > 0 && item.hasPrice && item.price !== null
      ? item.price / (1 - discount / 100)
      : null;

  const swatchStart = item.id % SWATCHES.length;
  const swatchDots = [0, 1, 2].map((i) => SWATCHES[(swatchStart + i) % SWATCHES.length]);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card bg-surface shadow-card transition-shadow duration-300 hover:shadow-card-up">
      {/* Image area */}
      <div className="relative overflow-hidden">
        <ProductImage item={item} />
        <SaveHeart />
        {/* Badge: discount (in-stock) or out-of-stock */}
        {discount > 0 ? (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-clay px-2.5 py-0.5 text-[11px] font-bold text-white">
            -{discount}%
          </span>
        ) : !item.inStock ? (
          <StockBadge />
        ) : null}

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

        {/* Color swatches */}
        <div className="mt-1 flex gap-1.5">
          {swatchDots.map((color, i) => (
            <span
              key={color}
              className={`h-3 w-3 rounded-full border border-hairline${i === 0 ? " ring-1 ring-pine ring-offset-1" : ""}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <div className="flex flex-col gap-0.5">
            {originalPrice !== null && (
              <span className="text-xs text-ink-400 line-through">
                ${originalPrice.toFixed(2)}
              </span>
            )}
            <PriceTag price={item.price} hasPrice={item.hasPrice} />
          </div>
          <RatingStars rating={item.rating} reviews={item.reviews} />
        </div>
      </div>
    </article>
  );
}
