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
    <div className="flex items-center gap-1.5 text-xs text-pine-tint/70">
      <span className="text-pine-tint/60">{icon}</span>
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
    <section className="mx-auto max-w-[1240px] px-7 pt-6">
      {/* Banner card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pine to-[#3C5A47]">
        <div className="flex items-center justify-between gap-8 px-10 py-12 lg:px-14">

          {/* Left — copy + search */}
          <div className="flex max-w-lg flex-col gap-5">
            <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-pine-tint/60">
              New Collection
            </p>

            <h1
              className="font-display font-semibold leading-[1.08] tracking-[-0.025em] text-white"
              style={{ fontSize: "clamp(28px, 4vw, 48px)" }}
            >
              Discover pieces{" "}
              <em style={{ fontStyle: "italic" }}>crafted with care</em>
            </h1>

            <p className="text-sm leading-relaxed text-pine-tint/70">
              4,000 products from independent makers — searched and sorted to find exactly what you&rsquo;re looking for.
            </p>

            {/* Search */}
            <form onSubmit={handleSubmit} className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-ink-400">
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
                className="w-full rounded-full bg-white/95 py-3.5 pl-11 pr-32 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-pine px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#223328]"
              >
                Shop Now →
              </button>
            </form>

            {/* Trust chips */}
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <TrustChip
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
                label="Free shipping over $75"
              />
              <TrustChip
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
                label="400+ makers"
              />
              <TrustChip
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                label="Easy returns"
              />
            </div>
          </div>

          {/* Right — illustration */}
          <div className="relative hidden shrink-0 lg:block">
            <div className="flex h-[260px] w-[180px] items-center justify-center rounded-2xl bg-white/10 p-6">
              <HearthIllustration />
            </div>
            <div className="absolute -left-4 top-6 rounded-full bg-white px-3.5 py-1.5 shadow-card">
              <p className="text-[11px] font-semibold text-ink-700">400+ makers</p>
            </div>
            <div className="absolute -right-4 bottom-6 rounded-full bg-pine-tint px-3.5 py-1.5 shadow-card">
              <p className="text-[11px] font-semibold text-pine">Ships today</p>
            </div>
          </div>

        </div>

        {/* Pagination dots */}
        <div className="flex items-center justify-center gap-1.5 pb-4">
          <span className="h-1.5 w-5 rounded-full bg-white" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
        </div>
      </div>
    </section>
  );
}
