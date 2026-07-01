export function PromoBanner() {
  const cards = [
    {
      bg: "bg-[#fbf0ec] border border-clay/20",
      iconColor: "text-clay",
      icon: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01",
      title: "Flash Sale",
      body: "Up to 30% off select items",
      cta: "Shop deals",
    },
    {
      bg: "bg-pine-tint border border-pine/20",
      iconColor: "text-pine",
      icon: "M5 12h14 M12 5l7 7-7 7 M3 6v14a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V6M1 6l3-4h16l3 4",
      title: "Free Shipping",
      body: "On all orders over $75",
      cta: "Learn more",
    },
    {
      bg: "bg-surface-alt border border-hairline",
      iconColor: "text-ink-400",
      icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
      title: "New Arrivals",
      body: "Fresh picks from our makers",
      cta: "See what's new",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map(({ bg, iconColor, icon, title, body, cta }) => (
        <div key={title} className={`flex flex-col gap-2 rounded-2xl p-5 ${bg}`}>
          <div className={`${iconColor}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
              <path d={icon} />
            </svg>
          </div>
          <p className="text-sm font-semibold text-ink-900">{title}</p>
          <p className="text-xs leading-relaxed text-ink-500">{body}</p>
          <button type="button" className="mt-1 flex items-center gap-1 text-xs font-semibold text-pine transition-opacity hover:opacity-70">
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
