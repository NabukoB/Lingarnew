"use client";

import { useState, useEffect, useRef } from "react";
import type { CleanedItem } from "@/types/item";

const SWATCHES = ["#E9E1D2", "#DCE2D7", "#E8DACF", "#DBE0E1", "#EAE1C8"];

function ImagePlaceholderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-8 w-8"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

export function ProductImage({ item }: { item: CleanedItem }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const swatch = SWATCHES[item.id % SWATCHES.length];

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden"
      style={{ backgroundColor: swatch }}
    >
      {item.image && !failed ? (
        <img
          ref={imgRef}
          src={item.image}
          alt={item.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-ink-500">
          <ImagePlaceholderIcon />
          <span className="text-xs font-semibold uppercase tracking-[.1em]">
            {item.category}
          </span>
        </div>
      )}
    </div>
  );
}
