"use client";

import { CATEGORIES } from "@/lib/cleaning/constants";
import type { Category } from "@/types/item";

export function CategoryChips({ onSelect }: { onSelect: (category: Category) => void }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-500">
        Browse by category
      </h2>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            className="rounded-full border border-ink-200 bg-white px-4 py-2 text-sm text-ink-700 transition-colors hover:border-clay-400 hover:text-clay-600"
          >
            {category}
          </button>
        ))}
      </div>
    </section>
  );
}
