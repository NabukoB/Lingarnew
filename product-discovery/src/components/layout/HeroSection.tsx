"use client";

import { useState } from "react";

function HearthIllustration() {
  return (
    <svg
      viewBox="0 0 200 300"
      fill="none"
      stroke="#20201C"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-full w-full max-h-[300px]"
    >
      {/* Stems */}
      <path d="M88 162 C86 140 82 118 78 96 C75 78 72 60 68 44" strokeWidth="2.5" />
      <path d="M100 162 C100 138 101 114 100 90 C99 68 99 46 97 28" strokeWidth="2.5" />
      <path d="M112 162 C114 140 118 118 122 96 C125 78 128 60 132 44" strokeWidth="2.5" />

      {/* Leaves – left stem */}
      <path d="M78 96 C66 88 60 74 62 62 C70 68 76 80 78 94" fill="#DCE2D7" strokeWidth="1.5" />
      <path d="M72 66 C60 60 55 47 58 36 C65 43 71 55 72 64" fill="#DCE2D7" strokeWidth="1.5" />

      {/* Leaves – center stem */}
      <path d="M100 90 C112 81 118 68 114 56 C107 63 101 76 100 88" fill="#DCE2D7" strokeWidth="1.5" />
      <path d="M99 60 C88 52 82 40 86 29 C93 36 98 48 99 58" fill="#DCE2D7" strokeWidth="1.5" />

      {/* Leaves – right stem */}
      <path d="M122 96 C134 87 140 73 136 61 C129 68 123 81 122 94" fill="#DCE2D7" strokeWidth="1.5" />
      <path d="M130 60 C140 51 145 38 141 27 C134 34 129 46 130 58" fill="#DCE2D7" strokeWidth="1.5" />

      {/* Small berries at top */}
      <circle cx="97" cy="28" r="4.5" fill="#B5654A" stroke="#20201C" strokeWidth="1.5" />
      <circle cx="90" cy="20" r="3.5" fill="#B5654A" stroke="#20201C" strokeWidth="1.5" />
      <circle cx="104" cy="22" r="3.5" fill="#B5654A" stroke="#20201C" strokeWidth="1.5" />
      <circle cx="96" cy="14" r="2.5" fill="#B5654A" stroke="#20201C" strokeWidth="1.5" />

      {/* Vase body */}
      <path
        d="M82 162 C78 180 74 205 76 228 C78 248 86 258 100 260 C114 258 122 248 124 228 C126 205 122 180 118 162 Z"
        fill="#FBF8F2"
        strokeWidth="2.5"
      />

      {/* Vase neck */}
      <path d="M82 162 C84 154 90 150 100 150 C110 150 116 154 118 162" strokeWidth="2.5" fill="none" />

      {/* Vase rim */}
      <ellipse cx="100" cy="150" rx="20" ry="5" fill="#FBF8F2" strokeWidth="2" />

      {/* Vase glaze highlight */}
      <path d="M82 195 C81 210 82 224 84 234" strokeWidth="1" strokeOpacity="0.25" />

      {/* Base shadow */}
      <ellipse cx="100" cy="264" rx="28" ry="6" fill="#20201C" fillOpacity="0.06" stroke="none" />
    </svg>
  );
}

function TrustChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-ink-600">
      <span className="text-pine">{icon}</span>
      {label}
    </div>
  );
}

export function HeroSection({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch(query);
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section className="mx-auto max-w-[1240px] px-7 py-16 lg:py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">

        {/* Left — copy + search */}
        <div className="flex flex-col gap-6">
          <p className="text-[11.5px] font-semibold uppercase tracking-[.16em] text-ink-400">
            Curated home goods
          </p>

          <h1
            className="font-display font-semibold leading-[1.08] tracking-[-0.025em] text-ink-900"
            style={{ fontSize: "clamp(38px, 5.4vw, 62px)" }}
          >
            Discover pieces{" "}
            <em className="font-medium not-italic" style={{ fontStyle: "italic" }}>
              crafted with care
            </em>
          </h1>

          <p className="text-base leading-relaxed text-ink-500">
            4,000 products from independent makers — searched and sorted to help you find exactly what you&rsquo;re looking for.
          </p>

          {/* Search */}
          <form onSubmit={handleSubmit} className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-5 flex items-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-ink-400">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, tag, or brand…"
              aria-label="Search products"
              className="w-full rounded-full border border-hairline bg-surface py-4 pl-14 pr-36 text-base text-ink-900 placeholder:text-ink-400 focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine-tint"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-pine px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pine-hover"
            >
              Search
            </button>
          </form>

          {/* Trust chips */}
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <TrustChip
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
              label="Free shipping over $75"
            />
            <TrustChip
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
              label="400+ independent makers"
            />
            <TrustChip
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="20 6 9 17 4 12"/></svg>}
              label="30-day easy returns"
            />
          </div>
        </div>

        {/* Right — illustration panel */}
        <div className="relative hidden overflow-hidden rounded-[28px] bg-gradient-to-br from-surface to-swatch-oat lg:flex lg:items-center lg:justify-center lg:py-12">
          <div className="w-[200px]">
            <HearthIllustration />
          </div>

          {/* Floating trust tags */}
          <div className="absolute left-6 top-8 rounded-full bg-surface px-4 py-2 shadow-card">
            <p className="text-xs font-semibold text-ink-700">400+ makers</p>
          </div>
          <div className="absolute bottom-8 right-6 rounded-full bg-pine px-4 py-2 shadow-card">
            <p className="text-xs font-semibold text-white">Ships today</p>
          </div>
        </div>

      </div>
    </section>
  );
}
