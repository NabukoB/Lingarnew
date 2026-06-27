import type { Insight } from "@/types";

const TAG_COLORS: Record<string, string> = {
  "AI": "bg-purple-100 text-purple-700",
  "startup": "bg-green-100 text-green-700",
  "investing": "bg-blue-100 text-blue-700",
  "finance": "bg-amber-100 text-amber-700",
};

function tagColor(tag: string) {
  const key = Object.keys(TAG_COLORS).find(k => tag.toLowerCase().includes(k.toLowerCase()));
  return key ? TAG_COLORS[key] : "bg-gray-100 text-gray-600";
}

export function InsightItem({ insight }: { insight: Insight }) {
  const relevancePct = Math.round(insight.relevance_score * 100);

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-lingar-ink leading-snug text-[15px] flex-1">
            {insight.title}
          </h3>
          <span className="text-[11px] text-lingar-ghost shrink-0 mt-0.5">
            {relevancePct}%
          </span>
        </div>
        <p className="text-[13px] text-gray-600 leading-relaxed">{insight.summary}</p>
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
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
        <div className="px-3 py-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-lingar-accent mb-1">Why it matters</p>
          <p className="text-[11px] text-gray-600 leading-snug">
            {insight.why_it_matters ?? "Relevant to your goals."}
          </p>
        </div>
        <div className="px-3 py-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-purple-500 mb-1">Signal</p>
          <p className="text-[11px] text-gray-600 leading-snug">
            {relevancePct >= 70 ? "Strong match for your interests." : relevancePct >= 40 ? "Moderate relevance." : "Low signal — consider the source."}
          </p>
        </div>
        <div className="px-3 py-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Action</p>
          <p className="text-[11px] text-gray-600 leading-snug">
            Explore how this connects to your work.
          </p>
        </div>
      </div>
    </article>
  );
}
