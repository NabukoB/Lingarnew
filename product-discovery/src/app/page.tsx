import rawItems from "@/data/items.json";
import type { RawItem } from "@/types/raw-item";
import { cleanCatalog } from "@/lib/cleaning/clean-catalog";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PageShell } from "@/components/layout/PageShell";

export default function Page() {
  const items = cleanCatalog(rawItems as RawItem[]);

  return (
    <>
      <SiteHeader />
      <PageShell items={items} />
    </>
  );
}
