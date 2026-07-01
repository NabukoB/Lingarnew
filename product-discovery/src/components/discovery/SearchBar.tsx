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
      <div className="pointer-events-none absolute inset-y-0 left-5 flex items-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 text-ink-400"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search for products, brands and more..."
        aria-label="Search products"
        className="w-full rounded-full border border-hairline bg-white py-3.5 pl-12 pr-6 text-sm text-ink-800 placeholder:text-ink-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-100"
      />
    </div>
  );
}
