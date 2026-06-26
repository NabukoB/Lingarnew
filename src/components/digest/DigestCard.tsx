import Link from "next/link";
import { formatDigestDate } from "@/lib/utils/date";
import type { Digest } from "@/types";

interface DigestCardProps {
  digest: Digest;
}

export function DigestCard({ digest }: DigestCardProps) {
  const insightCount = digest.insight_ids.length;
  const ghostCount = digest.ghost_note_ids.length;

  return (
    <Link
      href={`/digest/${digest.slug}`}
      className="block border border-gray-100 rounded-lg p-5 bg-white hover:border-gray-200 hover:shadow-sm transition-all"
    >
      <p className="text-xs text-lingar-ghost uppercase tracking-widest mb-1">
        {formatDigestDate(digest.slug)}
      </p>
      <h3 className="font-semibold text-lingar-ink leading-snug mb-3">
        {digest.headline ?? "Daily brief"}
      </h3>
      <div className="flex gap-4 text-xs text-lingar-ghost">
        <span>{insightCount} insight{insightCount !== 1 ? "s" : ""}</span>
        {ghostCount > 0 && (
          <span>{ghostCount} ghost note{ghostCount !== 1 ? "s" : ""}</span>
        )}
      </div>
    </Link>
  );
}
