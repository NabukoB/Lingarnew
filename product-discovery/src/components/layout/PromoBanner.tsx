"use client";

import { useState, useEffect } from "react";

function Countdown() {
  const [time, setTime] = useState({ h: 2, m: 45, s: 18 });

  useEffect(() => {
    const id = setInterval(() => {
      setTime((t) => {
        let { h, m, s } = t;
        s -= 1;
        if (s < 0) { s = 59; m -= 1; }
        if (m < 0) { m = 59; h -= 1; }
        if (h < 0) { h = 2; m = 45; s = 18; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="mt-1 flex items-center gap-1 text-rose-600">
      {[pad(time.h), pad(time.m), pad(time.s)].map((val, i) => (
        <span key={i}>
          <span className="inline-block min-w-[26px] rounded bg-rose-100 px-1.5 py-0.5 text-center text-sm font-bold tabular-nums">{val}</span>
          {i < 2 && <span className="mx-0.5 font-bold">:</span>}
        </span>
      ))}
    </div>
  );
}

const CARDS = [
  {
    bg: "bg-rose-50",
    border: "border-rose-100",
    icon: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01",
    iconColor: "text-rose-500",
    title: "Flash Sale",
    body: "Up to 30% off select items",
    cta: "Shop deals",
    countdown: true,
  },
  {
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    icon: "M5 12h14M12 5l7 7-7 7M3 6v14a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V6",
    iconColor: "text-emerald-600",
    title: "Free Shipping",
    body: "On all orders over $75",
    cta: "Learn more",
    countdown: false,
  },
  {
    bg: "bg-orange-50",
    border: "border-orange-100",
    icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    iconColor: "text-orange-500",
    title: "New Arrivals",
    body: "Fresh picks from our makers",
    cta: "See what's new",
    countdown: false,
  },
];

export function PromoBanner() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {CARDS.map(({ bg, border, icon, iconColor, title, body, cta, countdown }) => (
        <div key={title} className={`flex flex-col gap-2 rounded-2xl border p-5 ${bg} ${border}`}>
          <div className={iconColor}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
              <path d={icon} />
            </svg>
          </div>
          <p className="text-sm font-bold text-ink-900">{title}</p>
          <p className="text-xs leading-relaxed text-ink-500">{body}</p>
          {countdown && <Countdown />}
          <button type="button" className={`mt-1 flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70 ${iconColor}`}>
            {cta}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
