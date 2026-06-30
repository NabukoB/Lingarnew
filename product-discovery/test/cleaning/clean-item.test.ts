import { test } from "node:test";
import assert from "node:assert/strict";
import { coercePrice } from "../../src/lib/cleaning/price.ts";
import { cleanTitle } from "../../src/lib/cleaning/text.ts";
import { cleanItem } from "../../src/lib/cleaning/clean-item.ts";
import type { RawItem } from "../../src/types/raw-item.ts";

function baseRawItem(overrides: Partial<RawItem> = {}): RawItem {
  return {
    id: 1,
    title: "Brushed Rattan Crate",
    brand: "Orla & Vine",
    category: "Storage",
    tags: ["brushed", "crate", "rattan"],
    price: 1111.05,
    rating: 3.4,
    reviews: 176,
    inStock: true,
    releasedAt: "2022-02-18",
    image: "https://picsum.photos/seed/cat1/500/320",
    imageWidth: 500,
    imageHeight: 320,
    description: "Small-batch Rattan crate, made to order.",
    ...overrides,
  };
}

test("coercePrice strips comma thousands-separators from string prices", () => {
  assert.equal(coercePrice("1,081.43"), 1081.43);
});

test("coercePrice treats null as no price", () => {
  assert.equal(coercePrice(null), null);
});

test("coercePrice treats zero and negative numbers as no price", () => {
  assert.equal(coercePrice(0), null);
  assert.equal(coercePrice(-5), null);
});

test("coercePrice treats unparseable strings as no price", () => {
  assert.equal(coercePrice("N/A"), null);
});

test("cleanTitle trims whitespace and title-cases ALL CAPS input, for both display and search", () => {
  const { display, search } = cleanTitle("  VINTAGE OAK BIN ");
  assert.equal(display, "Vintage Oak Bin");
  assert.equal(search, "vintage oak bin");
});

test("cleanItem produces null image fields when the raw image is missing", () => {
  const item = cleanItem(
    baseRawItem({ image: null, imageWidth: null, imageHeight: null })
  );
  assert.equal(item.image, null);
  assert.equal(item.imageWidth, null);
  assert.equal(item.imageHeight, null);
  assert.equal(item.aspectRatio, null);
});

test("cleanItem passes through a null rating as null", () => {
  const item = cleanItem(baseRawItem({ rating: null }));
  assert.equal(item.rating, null);
});

test("cleanItem cleans a well-formed item without surprises", () => {
  const item = cleanItem(baseRawItem());
  assert.equal(item.title, "Brushed Rattan Crate");
  assert.equal(item.titleSearch, "brushed rattan crate");
  assert.equal(item.brand, "Orla & Vine");
  assert.equal(item.category, "Storage");
  assert.deepEqual(item.tagsSearch, ["brushed", "crate", "rattan"]);
  assert.equal(item.price, 1111.05);
  assert.equal(item.hasPrice, true);
  assert.equal(item.aspectRatio, 500 / 320);
});
