# Product Discovery — Home Goods Catalog

A small, single-page product discovery experience over ~4,000 home-goods products.
Built for search-and-browse, not a full store.

**Stack:** Next.js (App Router), React, Tailwind. Client-side search, no backend.

---

## How to run

```bash
npm install
npm run dev
# open http://localhost:3002
```

The catalog (`src/data/items.json`, ~4,000 items) is cleaned once at build time
and searched in memory on the client.

---

## What I built

A discovery page where you can search and browse home goods, with results designed
to feel fast and trustworthy. Search the box, browse by category (a two-row icon
grid) when the box is empty alongside a row of 12 popular picks, filter by
category / price / availability.

---

## The decisions that mattered (and why)

The task said the decisions *around* search matter more than the search itself.
So I opened the data first. It's deliberately messy — about 18% of items have at
least one quality issue. The interesting work was deciding how to handle that for
a real shopper. The calls I made:

**1. Search across title + tags + brand, not title alone.**
The tags don't always match the title — e.g. a "Minimal Rattan Cutting Board" is
tagged `[kitchen, minimal]` with no "rattan." Title-only search would miss it.
Searching title + tags + brand (case-insensitive, partial-word) catches what a
shopper actually means. This was the headline decision.

**2. Normalize dirty data instead of trusting it.**
16 titles arrived ALL CAPS with stray whitespace (`"  VINTAGE OAK BIN "`). I trim
and title-case them for both search and display, so they're findable and don't
shout in the grid. A small cleaning layer (`src/lib/cleaning/`) validates every
item on load — and one issue the brief didn't call out: price sometimes arrives
as a comma-formatted string (`"1,081.43"`), not a number. The cleaning layer
coerces that too. Any item with an unrecognized category falls back to "Decor"
rather than crashing or getting dropped — defensive, and not currently triggered
by this dataset (every item's category is valid today), but a real safety net.

**3. Handle broken records honestly, never show "$0" or a broken image.**
164 items have no price and 14 are priced ≤ 0 (plus a handful of unparseable
price strings) — all shown as "Price unavailable" and sorted last, never as "$0."
183 items have no image — they get a clean placeholder card, not a broken-image
icon. A separate, sneakier case: 168 items (4.2%) *do* have an image URL, but it
points at a host that doesn't resolve — the browser would otherwise render its
native broken-image icon. `ProductImage` catches that with an `onError` fallback
and swaps in the same placeholder, so a present-but-dead URL degrades exactly
like a missing one. Missing ratings hide the stars rather than showing zero.

**4. A real browse state, because it's a *discovery* page.**
An empty search box isn't a dead end — it shows the 10 categories and a row of
popular in-stock items, so someone with no query still has somewhere to go.

**5. Cap results instead of dumping everything.**
Search/filter results are capped at 60 cards with a "showing top N, refine to
see more" note, rather than rendering an unbounded grid — keeps the page fast
and nudges toward narrowing the query instead of scrolling forever.

**6. Show out-of-stock, but de-prioritize it.**
~10% of items are out of stock. I rank in-stock first and badge the rest rather
than hiding them — a shopper may still want to see a product that's coming back.

**Ranking** is intentionally simple and explainable: title matches above
tag/brand matches, in-stock above out-of-stock, then by rating (nulls last).

---

## What I'd do next, and the tradeoff I'd watch

**Next:** typo-tolerance and synonym handling (so "couch" finds "sofa"), and
saved/recent searches.

**The tradeoff:** client-side search is the right call at 4,000 items — instant,
no backend, perfect feel. It won't hold past ~50k items or once you need ranked
relevance and fuzzy matching. The move then is a real search index
(Meilisearch / Typesense / Postgres FTS) — which buys power and scale but trades
away the zero-latency simplicity.
