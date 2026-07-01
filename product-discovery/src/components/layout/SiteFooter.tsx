const LINKS = {
  Shop: ["All products", "New arrivals", "Best sellers", "Sale"],
  Makers: ["Become a maker", "Maker stories", "Application"],
  Company: ["About Hearth", "Journal", "Press", "Careers"],
  Help: ["FAQ", "Shipping", "Returns", "Contact us"],
};

export function SiteFooter() {
  return (
    <footer className="bg-ink-800 text-ink-300">
      <div className="mx-auto max-w-[1240px] px-7 py-16">
        <div className="grid gap-10 md:grid-cols-5">
          {/* Brand */}
          <div className="md:col-span-1">
            <p className="font-display text-xl font-semibold italic text-white">Hearth</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-400">
              A curated marketplace for hand-picked home goods from independent makers.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="mb-4 text-[11.5px] font-semibold uppercase tracking-[.16em] text-ink-400">
                {heading}
              </h4>
              <ul className="flex flex-col gap-2">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-ink-400 transition-colors hover:text-white"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-ink-700 pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-ink-500">
            &copy; {new Date().getFullYear()} Hearth. Made with care.
          </p>
          <div className="flex gap-5 text-xs text-ink-500">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
