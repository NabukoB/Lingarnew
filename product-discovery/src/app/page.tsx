import rawItems from "@/data/items.json";
import type { RawItem } from "@/types/raw-item";
import { cleanCatalog } from "@/lib/cleaning/clean-catalog";
import { CatalogExplorer } from "@/components/discovery/CatalogExplorer";

export default function Page() {
  const items = cleanCatalog(rawItems as RawItem[]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-ink-900">
          Home Goods
        </h1>
        <p className="mt-1 text-ink-500">
          Search {items.length.toLocaleString()} products, or browse by category.
        </p>
      </header>
      <CatalogExplorer items={items} />
    </main>
  );
}
