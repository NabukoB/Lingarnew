import type { CleanedItem } from "@/types/item";
import { ProductImage } from "@/components/product/ProductImage";
import { RatingStars } from "@/components/product/RatingStars";
import { StockBadge } from "@/components/product/StockBadge";
import { PriceTag } from "@/components/product/PriceTag";
import { SaveHeart } from "@/components/product/SaveHeart";

function getDiscount(id: number): number {
  if (id % 7 === 0) return 30;
  if (id % 5 === 0) return 25;
  if (id % 3 === 0) return 20;
  return 0;
}

const SWATCHES = ["#EDE9FE", "#FCE7F3", "#D1FAE5", "#FEF3C7", "#DBEAFE"];

export function ProductCard({ item }: { item: CleanedItem }) {
  const discount = item.inStock ? getDiscount(item.id) : 0;
  const originalPrice =
    discount > 0 && item.hasPrice && item.price !== null
      ? item.price / (1 - discount / 100)
      : null;

  const swatchStart = item.id % SWATCHES.length;
  const swatchDots = [0, 1, 2].map((i) => SWATCHES[(swatchStart + i) % SWATCHES.length]);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-hairline bg-white shadow-card transition-shadow duration-300 hover:shadow-card-up">
      {/* Image */}
      <div className="relative overflow-hidden">
        <ProductImage item={item} />
        <SaveHeart />
        {discount > 0 ? (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
            -{discount}%
          </span>
        ) : !item.inStock ? (
          <StockBadge />
        ) : null}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-[11px] font-semibold uppercase tracking-[.12em] text-ink-400">
          {item.category}
        </span>
        <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug text-ink-900">
          {item.title}
        </h3>
        <p className="text-[12px] text-ink-400">{item.brand}</p>

        {/* Color swatches */}
        <div className="mt-1 flex gap-1.5">
          {swatchDots.map((color, i) => (
            <span
              key={color}
              className={`h-3 w-3 rounded-full border border-hairline${i === 0 ? " ring-1 ring-primary ring-offset-1" : ""}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* Price + rating + cart */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="flex flex-col gap-0.5">
            {originalPrice !== null && (
              <span className="text-xs text-ink-400 line-through">
                ${originalPrice.toFixed(2)}
              </span>
            )}
            <PriceTag price={item.price} hasPrice={item.hasPrice} />
            <RatingStars rating={item.rating} reviews={item.reviews} />
          </div>

          {/* Cart button */}
          {item.inStock && (
            <button
              type="button"
              aria-label="Add to cart"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
