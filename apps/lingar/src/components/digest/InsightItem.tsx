import type { Insight } from "@/types";

const TAG_COLORS: Record<string, string> = {
  ai: "bg-purple-900/60 text-purple-300",
  startup: "bg-emerald-900/60 text-emerald-300",
  investing: "bg-blue-900/60 text-blue-300",
  finance: "bg-amber-900/60 text-amber-300",
  biotech: "bg-cyan-900/60 text-cyan-300",
  tech: "bg-purple-900/60 text-purple-300",
};

function tagColor(tag: string) {
  const key = Object.keys(TAG_COLORS).find((k) =>
    tag.toLowerCase().includes(k)
  );
  return key ? TAG_COLORS[key] : "bg-lingar-surface2 text-lingar-ghost";
}

export function InsightItem({ insight }: { insight: Insight }) {
  const relevancePct = Math.round(insight.relevance_score * 100);

  return (
    <article className="bg-lingar-surface rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-lingar-paper leading-snug text-[15px] flex-1">
          {insight.title}
        </h3>
        <span className="text-[11px] text-lingar-ghost shrink-0 mt-0.5 font-medium">
          {relevancePct}%
        </span>
      </div>

      <p className="text-[13px] text-gray-300 leading-relaxed">{insight.summary}</p>

      {insight.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {insight.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${tagColor(tag)}`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

    </article>
  );
}
