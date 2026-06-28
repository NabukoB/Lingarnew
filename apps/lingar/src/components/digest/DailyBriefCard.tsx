import Link from "next/link";
import type { Digest } from "@/types";

const svgBase = {
  width: "11",
  height: "11",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

type PillDef = { icon: React.ReactNode; label: string };

function pillFor(tag: string): PillDef {
  const t = tag.toLowerCase();
  if (t.includes("world") || t.includes("global") || t.includes("geo"))
    return {
      label: "World",
      icon: (
        <svg {...svgBase}>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
    };
  if (t.includes("market") || t.includes("finance") || t.includes("invest"))
    return {
      label: "Markets",
      icon: (
        <svg {...svgBase}>
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      ),
    };
  if (t.includes("ai") || t.includes("tech") || t.includes("ml") || t.includes("machine"))
    return {
      label: "Technology",
      icon: (
        <svg {...svgBase}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
        </svg>
      ),
    };
  if (t.includes("startup") || t.includes("business"))
    return {
      label: "Business",
      icon: (
        <svg {...svgBase}>
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
    };
  return {
    label: tag.length > 12 ? tag.slice(0, 11) + "…" : tag,
    icon: (
      <svg {...svgBase}>
        <circle cx="12" cy="12" r="4" fill="currentColor" />
      </svg>
    ),
  };
}

interface Props {
  digest: Digest;
  topTags: string[];
}

export function DailyBriefCard({ digest, topTags }: Props) {
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
        <p className="text-[16px] text-lingar-paper leading-snug line-clamp-3">
          {digest.headline ?? "Your intelligence brief is ready."}
        </p>

        {/* Pills — single row */}
        {pills.length > 0 && (
          <div className="flex gap-2">
            {pills.map((p, i) => (
              <span
                key={i}
                className="flex items-center gap-1.5 text-[11px] text-lingar-ghost bg-lingar-surface2 border border-white/10 px-2.5 py-1 rounded-full whitespace-nowrap"
              >
                {p.icon}
                {p.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
