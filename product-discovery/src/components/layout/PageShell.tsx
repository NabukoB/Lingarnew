"use client";

import { useState } from "react";
import type { CleanedItem } from "@/types/item";
import { DEFAULT_FILTERS, type ActiveFilters } from "@/types/filters";
import { HeroSection } from "@/components/layout/HeroSection";
import { PromiseBand } from "@/components/layout/PromiseBand";
import { NewsletterCard } from "@/components/layout/NewsletterCard";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SideNav } from "@/components/layout/SideNav";
import { CatalogExplorer } from "@/components/discovery/CatalogExplorer";

export function PageShell({ items }: { items: CleanedItem[] }) {
  const [heroQuery, setHeroQuery] = useState("");
  const [filters, setFilters] = useState<ActiveFilters>(DEFAULT_FILTERS);

  return (
    <>
      <HeroSection onSearch={setHeroQuery} />
      <div className="mx-auto flex max-w-[1240px] gap-6 px-7 pb-16 pt-6">
        <SideNav filters={filters} onChange={setFilters} />
        <main id="catalog" className="min-w-0 flex-1 scroll-mt-20">
          <CatalogExplorer
            items={items}
            initialQuery={heroQuery}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </main>
      </div>
      <PromiseBand />
      <NewsletterCard />
      <SiteFooter />
    </>
  );
}
