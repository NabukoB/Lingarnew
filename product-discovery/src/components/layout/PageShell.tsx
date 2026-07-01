"use client";

import { useState } from "react";
import type { CleanedItem } from "@/types/item";
import { DEFAULT_FILTERS, type ActiveFilters } from "@/types/filters";
import { HeroSection } from "@/components/layout/HeroSection";
import { PromiseBand } from "@/components/layout/PromiseBand";
import { NewsletterCard } from "@/components/layout/NewsletterCard";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CatalogExplorer } from "@/components/discovery/CatalogExplorer";

export function PageShell({ items }: { items: CleanedItem[] }) {
  const [heroQuery, setHeroQuery] = useState("");
  const [filters, setFilters] = useState<ActiveFilters>(DEFAULT_FILTERS);

  return (
    <>
      <HeroSection onSearch={setHeroQuery} />
      <main id="catalog" className="mx-auto max-w-[1240px] scroll-mt-20 px-5 pb-16 pt-6">
        <CatalogExplorer
          items={items}
          initialQuery={heroQuery}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </main>
      <PromiseBand />
      <NewsletterCard />
      <SiteFooter />
    </>
  );
}
