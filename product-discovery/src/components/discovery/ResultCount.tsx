export function ResultCount({ total, shown }: { total: number; shown: number }) {
  if (total === 0) return null;

  return (
    <p className="text-sm font-semibold text-ink-700">
      {total.toLocaleString()} {total === 1 ? "result" : "results"}
      {shown < total ? (
        <span className="font-normal text-ink-400">
          {" "}— showing top {shown.toLocaleString()}, refine to see more
        </span>
      ) : null}
    </p>
  );
}
