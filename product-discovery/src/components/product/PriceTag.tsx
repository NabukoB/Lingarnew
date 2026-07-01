export function PriceTag({ price, hasPrice }: { price: number | null; hasPrice: boolean }) {
  if (!hasPrice || price === null) {
    return <span className="text-sm italic text-ink-400">Price unavailable</span>;
  }

  return (
    <span className="text-[16px] font-bold text-ink-900">
      ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}
