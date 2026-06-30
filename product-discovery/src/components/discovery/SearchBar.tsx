"use client";

export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by title, tag, or brand…"
        aria-label="Search products"
        className="w-full rounded-full border border-ink-200 bg-white px-5 py-3 text-base text-ink-900 placeholder:text-ink-400 focus:border-clay-400 focus:outline-none focus:ring-2 focus:ring-clay-200"
      />
    </div>
  );
}
