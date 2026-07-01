"use client";

import { useState } from "react";

export function SaveHeart() {
  const [saved, setSaved] = useState(false);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        setSaved((s) => !s);
      }}
      aria-label={saved ? "Remove from saved" : "Save item"}
      className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 backdrop-blur-sm transition-colors hover:bg-white"
    >
      <svg
        viewBox="0 0 24 24"
        fill={saved ? "#DC2626" : "none"}
        stroke={saved ? "#DC2626" : "#6B7280"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 transition-colors"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
