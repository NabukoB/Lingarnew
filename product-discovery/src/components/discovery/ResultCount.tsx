export function ResultCount({ total, shown }: { total: number; shown: number }) {
  if (total === 0) return null;

  return (
    <p className="text-[11.5px] font-semibold uppercase tracking-[.16em] text-ink-400">
      {total.toLocaleString()} {total === 1 ? "result" : "results"}
      {shown < total ? (
        <span className="font-normal normal-case tracking-normal">
          {" "}— showing top {shown}, refine to see more
        </span>
      ) : null}
    </p>
  );
}
