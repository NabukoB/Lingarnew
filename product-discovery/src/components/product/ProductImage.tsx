"use client";

import { useState, useEffect, useRef } from "react";
import type { CleanedItem } from "@/types/item";

function ImagePlaceholderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
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

  useEffect(() => {
    // Catch images that errored before React hydrated and attached onError
    if (imgRef.current?.complete && imgRef.current.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-ink-100">
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
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-ink-400">
          <ImagePlaceholderIcon />
          <span className="text-xs font-medium">
            {item.brand} · {item.category}
          </span>
        </div>
      )}
    </div>
  );
}
