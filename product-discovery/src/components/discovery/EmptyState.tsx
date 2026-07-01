export function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </div>
      <p className="text-lg font-bold text-ink-900">
        No results for &ldquo;{query}&rdquo;
      </p>
      <p className="max-w-xs text-sm leading-relaxed text-ink-500">
        Try a different term, or clear the search to browse by category.
      </p>
    </div>
  );
}
