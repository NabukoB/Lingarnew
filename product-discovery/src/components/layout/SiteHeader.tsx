export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between px-7 py-4">
        <a href="/" className="font-display text-xl font-semibold italic text-ink-900">
          Hearth
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {["Shop", "Collections", "Makers", "Journal"].map((link) => (
            <a
              key={link}
              href="#catalog"
              className="group relative text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
            >
              {link}
              <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-pine transition-all duration-200 group-hover:w-full" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Search"
            className="text-ink-500 transition-colors hover:text-ink-900"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Saved items"
            className="text-ink-500 transition-colors hover:text-ink-900"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Cart"
            className="flex items-center gap-2 rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-pine-hover"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
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
