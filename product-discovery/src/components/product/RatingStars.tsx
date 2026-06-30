export function RatingStars({ rating, reviews }: { rating: number | null; reviews: number }) {
  if (rating === null) return null;

  return (
    <div className="flex items-center gap-1 text-sm text-ink-600">
      <span aria-hidden="true" className="text-clay-500">
        ★
      </span>
      <span>{rating.toFixed(1)}</span>
      <span className="text-ink-400">({reviews.toLocaleString()})</span>
    </div>
  );
}
