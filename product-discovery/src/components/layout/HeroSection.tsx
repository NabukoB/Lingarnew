"use client";

import { useState } from "react";

const TILES = [
  { bg: "#EDE9FE", icon: "M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3M4 11h16v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4ZM6 16v3M18 16v3", label: "Furniture", color: "#5B21B6" },
  { bg: "#FCE7F3", icon: "M8 4h8l2 3-3 2v11H9V9L6 7l2-3Z", label: "Textiles", color: "#9D174D" },
  { bg: "#D1FAE5", icon: "M7 3v7a2 2 0 0 0 2 2v9M7 3v4M10 3v4M5 3v4M17 3c-2 1-2 4-2 6s2 3 2 5v7", label: "Kitchen", color: "#065F46" },
  { bg: "#FEF3C7", icon: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.4.3.6.8.6 1.2v.5h6v-.5c0-.4.2-.9.6-1.2A6 6 0 0 0 12 3Z", label: "Lighting", color: "#92400E" },
  { bg: "#DBEAFE", icon: "M12 3v3m0 12v3M5 12H3m18 0h-2M7 7l-1.5-1.5M18.5 18.5 17 17M7 17l-1.5 1.5M18.5 5.5 17 7m-5-1a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z", label: "Decor", color: "#1E40AF" },
  { bg: "#FFE4E6", icon: "M4 4h16v16H4V4Zm3 13 4-5 3 3 3-5", label: "Wall Art", color: "#9F1239" },
];

const ANGLES = ["-4deg", "3deg", "-2deg", "4deg", "-3deg", "2deg"];

export function HeroSection({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch(query);
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section className="overflow-hidden bg-gradient-to-br from-violet-700 via-violet-600 to-purple-500">
      <div className="mx-auto flex max-w-[1240px] items-center gap-10 px-5 py-10 md:py-14">

        {/* Left — copy + search */}
        <div className="flex flex-1 flex-col gap-6">
          <div>
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[.14em] text-white/80">
              New Collection
            </span>
            <h1
              className="font-display font-bold leading-[1.1] tracking-[-0.02em] text-white"
              style={{ fontSize: "clamp(28px, 4.5vw, 52px)" }}
            >
              Find Your Style,<br />
              <span className="text-yellow-200">Love Your Look</span>
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
              Discover home goods, decor, and lifestyle pieces from 400+ independent makers.
            </p>
          </div>

          {/* Search form */}
          <form onSubmit={handleSubmit} className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-ink-400" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for products, brands and more..."
              aria-label="Search products"
              className="w-full rounded-full bg-white py-4 pl-12 pr-36 text-sm text-ink-800 shadow-lg placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-800"
            >
              Shop Now
            </button>
          </form>

          {/* Pagination dots */}
          <div className="flex items-center gap-2">
            <span className="h-2 w-7 rounded-full bg-white" />
            <span className="h-2 w-2 rounded-full bg-white/35" />
            <span className="h-2 w-2 rounded-full bg-white/35" />
            <span className="h-2 w-2 rounded-full bg-white/35" />
          </div>
        </div>

        {/* Right — category tiles grid */}
        <div className="relative hidden shrink-0 lg:block">
          <div className="grid w-[268px] grid-cols-3 gap-3">
            {TILES.map(({ bg, icon, label, color }, i) => (
              <div
                key={label}
                className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl shadow-lg"
                style={{ backgroundColor: bg, transform: `rotate(${ANGLES[i]})` }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
                  <path d={icon} />
                </svg>
                <span className="text-center text-[9px] font-bold" style={{ color }}>{label}</span>
              </div>
            ))}
          </div>
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 rounded-full bg-white px-3 py-1.5 shadow-lg">
            <p className="text-[11px] font-bold text-primary">400+ makers</p>
          </div>
        </div>

      </div>
    </section>
  );
}
