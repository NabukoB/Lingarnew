import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-gray-100 bg-lingar-paper/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight text-lingar-ink">
          Lingar
        </Link>
        <nav className="flex items-center gap-6 text-sm text-lingar-ghost">
          <Link href="/digest" className="hover:text-lingar-ink transition-colors">
            Today
          </Link>
          <Link href="/archive" className="hover:text-lingar-ink transition-colors">
            Archive
          </Link>
          <Link href="/synthesis" className="hover:text-lingar-ink transition-colors">
            Ask the Ghost
          </Link>
        </nav>
      </div>
    </header>
  );
}
