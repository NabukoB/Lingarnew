export function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <p className="text-lg font-medium text-ink-700">
        No results for &ldquo;{query}&rdquo;
      </p>
      <p className="text-sm text-ink-500">Try a different term, or browse a category instead.</p>
    </div>
  );
}
