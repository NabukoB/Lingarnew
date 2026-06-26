import { Badge } from "@/components/ui/Badge";
import type { Insight } from "@/types";

interface InsightItemProps {
  insight: Insight;
}

function relevanceBadge(score: number) {
  if (score >= 0.7) return <Badge variant="green">{Math.round(score * 100)}% relevant</Badge>;
  if (score >= 0.4) return <Badge variant="amber">{Math.round(score * 100)}% relevant</Badge>;
  return <Badge variant="gray">{Math.round(score * 100)}% relevant</Badge>;
}

export function InsightItem({ insight }: InsightItemProps) {
  return (
    <article className="border border-gray-100 rounded-lg p-5 bg-white space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-lingar-ink leading-snug">{insight.title}</h3>
        {relevanceBadge(insight.relevance_score)}
      </div>

      <p className="text-sm text-gray-700 leading-relaxed">{insight.summary}</p>

      {insight.why_it_matters && (
        <p className="text-sm text-lingar-ghost italic border-l-2 border-gray-200 pl-3">
          {insight.why_it_matters}
        </p>
      )}

      {insight.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {insight.tags.map((tag) => (
            <Badge key={tag} variant="gray">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </article>
  );
}
