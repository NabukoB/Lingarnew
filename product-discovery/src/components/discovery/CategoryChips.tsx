"use client";

import { CATEGORIES } from "@/lib/cleaning/constants";
import type { Category } from "@/types/item";

const CATEGORY_ICON_PATHS: Record<Category, string> = {
  Bath: "M4 12h16M6 12V7a2 2 0 0 1 2-2h2v2M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6",
  Decor: "M12 3v3m0 12v3M5 12H3m18 0h-2M7 7l-1.5-1.5M18.5 18.5 17 17M7 17l-1.5 1.5M18.5 5.5 17 7m-5-1a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  Furniture: "M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3M4 11h16v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4ZM6 16v3M18 16v3",
  Kitchen: "M7 3v7a2 2 0 0 0 2 2v9M7 3v4M10 3v4M5 3v4M17 3c-2 1-2 4-2 6s2 3 2 5v7",
  Lighting: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.4.3.6.8.6 1.2v.5h6v-.5c0-.4.2-.9.6-1.2A6 6 0 0 0 12 3Z",
  Office: "M4 7h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Zm3 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M4 12h16",
  Outdoor: "M12 3 6 12h3l-4 7h14l-4-7h3L12 3Zm0 16v2",
  Storage: "M4 7h16v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Zm0 0 2-4h12l2 4M9 11h6",
  Textiles: "M8 4h8l2 3-3 2v11H9V9L6 7l2-3Z",
  "Wall Art": "M4 4h16v16H4V4Zm3 13 4-5 3 3 3-5",
};

function CategoryIcon({ category }: { category: Category }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d={CATEGORY_ICON_PATHS[category]} />
    </svg>
  );
}

export function CategoryChips({ onSelect }: { onSelect: (category: Category) => void }) {
  return (
    <section className="rounded-2xl border border-hairline bg-white p-5 shadow-card">
      <div className="flex gap-4 overflow-x-auto pb-1">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            className="group flex shrink-0 flex-col items-center gap-2"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-hairline bg-surface text-ink-500 transition-all group-hover:border-primary group-hover:bg-primary-50 group-hover:text-primary">
              <CategoryIcon category={category} />
            </span>
            <span className="text-center text-[11px] font-semibold text-ink-500 group-hover:text-primary">
              {category}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
