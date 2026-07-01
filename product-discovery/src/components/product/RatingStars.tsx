export function RatingStars({ rating, reviews }: { rating: number | null; reviews: number }) {
  if (rating === null) return null;

  return (
    <div className="flex items-center gap-1 text-xs">
      <span aria-hidden="true" className="text-amber-400">★</span>
      <span className="font-semibold text-ink-700">{rating.toFixed(1)}</span>
      <span className="text-ink-400">({reviews.toLocaleString()})</span>
    </div>
  );
}
