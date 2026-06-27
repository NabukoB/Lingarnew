import Link from "next/link";
import type { Digest } from "@/types";

type PillDef = { icon: string; label: string };

function pillFor(tag: string): PillDef {
  const t = tag.toLowerCase();
  if (t.includes("world") || t.includes("global") || t.includes("geo"))
    return { icon: "⊕", label: "World" };
  if (t.includes("market") || t.includes("finance") || t.includes("invest"))
    return { icon: "↗", label: "Markets" };
  if (t.includes("ai") || t.includes("tech") || t.includes("ml") || t.includes("machine"))
    return { icon: "⚙", label: "Technology" };
  if (t.includes("startup") || t.includes("business"))
    return { icon: "◈", label: "Business" };
  // truncate long tags to 12 chars
  return { icon: "●", label: tag.length > 12 ? tag.slice(0, 11) + "…" : tag };
}

interface Props {
  digest: Digest;
  topTags: string[];
}

export function DailyBriefCard({ digest, topTags }: Props) {
  // Deduplicate pills by label (multiple tags can map to same category)
  const pills = [...new Map(
    topTags.slice(0, 6).map(pillFor).map((p) => [p.label, p])
  ).values()].slice(0, 3);

  return (
    <Link href={`/digest/${digest.slug}`} className="block">
      <div className="bg-lingar-surface rounded-2xl p-4 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-lingar-surface2 border border-lingar-gold/30 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A050" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <line x1="8" y1="7" x2="16" y2="7" />
                <line x1="8" y1="11" x2="16" y2="11" />
                <line x1="8" y1="15" x2="12" y2="15" />
              </svg>
            </div>
            <p className="text-[16px] font-bold text-lingar-paper">Daily Brief</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>

        {/* Headline */}
        <p className="text-[13px] text-gray-300 leading-snug line-clamp-2">
          {digest.headline ?? "Your intelligence brief is ready."}
        </p>

        {/* Pills — single row */}
        {pills.length > 0 && (
          <div className="flex gap-2">
            {pills.map((p, i) => (
              <span
                key={i}
                className="flex items-center gap-1 text-[11px] text-lingar-ghost bg-lingar-surface2 border border-white/10 px-2.5 py-1 rounded-full whitespace-nowrap"
              >
                <span className="text-[10px]">{p.icon}</span>
                {p.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
