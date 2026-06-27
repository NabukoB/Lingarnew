import Link from "next/link";
import type { Digest } from "@/types";

const TAG_ICON: Record<string, string> = {
  ai: "⚙",
  technology: "⚙",
  tech: "⚙",
  world: "⊕",
  global: "⊕",
  geo: "⊕",
  markets: "↗",
  finance: "↗",
  investing: "↗",
  startup: "◈",
  business: "◈",
};

function pillIcon(tag: string): string {
  const lower = tag.toLowerCase();
  const key = Object.keys(TAG_ICON).find((k) => lower.includes(k));
  return key ? TAG_ICON[key]! : "●";
}

interface Props {
  digest: Digest;
  topTags: string[];
}

export function DailyBriefCard({ digest, topTags }: Props) {
  return (
    <Link href={`/digest/${digest.slug}`} className="block">
      <div className="bg-lingar-surface rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-lingar-surface2 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A050" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <line x1="8" y1="7" x2="16" y2="7" />
                <line x1="8" y1="11" x2="16" y2="11" />
                <line x1="8" y1="15" x2="12" y2="15" />
              </svg>
            </div>
            <p className="text-[13px] font-semibold text-lingar-paper">Daily Brief</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>

        <p className="text-[13px] text-gray-300 leading-snug line-clamp-2">
          {digest.headline ?? "Your intelligence brief is ready."}
        </p>

        {topTags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {topTags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-[11px] text-lingar-ghost bg-lingar-surface2 px-2.5 py-1 rounded-full"
              >
                <span className="text-[10px]">{pillIcon(tag)}</span>
                <span className="capitalize">{tag}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
