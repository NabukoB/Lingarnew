import type { Insight } from "@/types";

const TAG_COLORS: Record<string, string> = {
  "AI": "bg-purple-900/60 text-purple-300",
  "startup": "bg-emerald-900/60 text-emerald-300",
  "investing": "bg-blue-900/60 text-blue-300",
  "finance": "bg-amber-900/60 text-amber-300",
};

function tagColor(tag: string) {
  const key = Object.keys(TAG_COLORS).find((k) => tag.toLowerCase().includes(k.toLowerCase()));
  return key ? TAG_COLORS[key] : "bg-lingar-surface2 text-lingar-ghost";
}

export function InsightItem({ insight }: { insight: Insight }) {
  const relevancePct = Math.round(insight.relevance_score * 100);

  return (
    <article className="bg-lingar-surface rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-lingar-paper leading-snug text-[15px] flex-1">
            {insight.title}
          </h3>
          <span className="text-[11px] text-lingar-ghost shrink-0 mt-0.5">
            {relevancePct}%
          </span>
        </div>
        <p className="text-[13px] text-gray-300 leading-relaxed">{insight.summary}</p>
        {insight.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {insight.tags.slice(0, 3).map((tag) => (
              <span key={tag} className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${tagColor(tag)}`}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Three-panel footer */}
      <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10">
        <div className="px-3 py-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-lingar-gold mb-1">Why it matters</p>
          <p className="text-[11px] text-gray-400 leading-snug">
            {insight.why_it_matters ?? "Relevant to your goals."}
          </p>
        </div>
        <div className="px-3 py-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-purple-400 mb-1">Signal</p>
          <p className="text-[11px] text-gray-400 leading-snug">
            {relevancePct >= 70 ? "Strong match." : relevancePct >= 40 ? "Moderate relevance." : "Low signal."}
          </p>
        </div>
        <div className="px-3 py-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 mb-1">Action</p>
          <p className="text-[11px] text-gray-400 leading-snug">
            Explore how this connects.
          </p>
        </div>
      </div>
    </article>
  );
}
