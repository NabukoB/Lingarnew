export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-5 py-3.5">
        <a href="/" className="mr-auto font-display text-xl font-bold text-primary">
          Hearth
        </a>

        <nav className="hidden items-center gap-6 md:flex">
          {["Shop", "Collections", "Makers", "Journal"].map((link) => (
            <a
              key={link}
              href="#catalog"
              className="text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
            >
              {link}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Wishlist"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-primary-50 hover:text-primary"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          <button
            type="button"
            aria-label="Cart"
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            Cart
          </button>
        </div>
      </div>
    </header>
  );
}
