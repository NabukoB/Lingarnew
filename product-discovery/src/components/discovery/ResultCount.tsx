export function ResultCount({ total, shown }: { total: number; shown: number }) {
  if (total === 0) return null;

  return (
    <p className="text-sm text-ink-500">
      {total.toLocaleString()} {total === 1 ? "result" : "results"}
      {shown < total ? ` — showing top ${shown}, refine to see more` : ""}
    </p>
  );
}
