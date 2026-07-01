"use client";

import { useState } from "react";
import type { CleanedItem } from "@/types/item";
import { HeroSection } from "@/components/layout/HeroSection";
import { PromiseBand } from "@/components/layout/PromiseBand";
import { NewsletterCard } from "@/components/layout/NewsletterCard";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CatalogExplorer } from "@/components/discovery/CatalogExplorer";

export function PageShell({ items }: { items: CleanedItem[] }) {
  const [heroQuery, setHeroQuery] = useState("");

  return (
    <>
      <HeroSection onSearch={setHeroQuery} />
      <main
        id="catalog"
        className="mx-auto max-w-[1240px] scroll-mt-20 px-7 pb-8 pt-4"
      >
        <CatalogExplorer items={items} initialQuery={heroQuery} />
      </main>
      <PromiseBand />
      <NewsletterCard />
      <SiteFooter />
    </>
  );
}
