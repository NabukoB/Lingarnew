import type { GhostNote } from "@/types";

interface TensionSource {
  name: string;
  quote: string;
}

interface Props {
  note: GhostNote;
  sourceA: TensionSource;
  sourceB: TensionSource;
}

export function TensionMapping({ note, sourceA, sourceB }: Props) {
  return (
    <div className="bg-lingar-surface rounded-2xl p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-lingar-surface2 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A050" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3L3 9v12h6v-7h6v7h6V9L12 3z" />
            </svg>
          </div>
          <p className="text-[13px] font-semibold text-lingar-paper">Tension Mapping</p>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-bold text-lingar-amber bg-lingar-amber/10 px-2 py-0.5 rounded-full shrink-0">
          <span>⚠</span>
          <span>Contradiction Alert</span>
        </span>
      </div>

      <p className="text-[12px] text-gray-400 leading-snug">{note.title}</p>

      {/* VS layout */}
      <div className="grid grid-cols-[1fr_32px_1fr] gap-2 items-start">
        {/* Source A */}
        <div className="bg-lingar-surface2 rounded-xl p-3 space-y-1.5">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest truncate">
            {sourceA.name}
          </p>
          <p className="text-[11px] text-gray-300 leading-snug line-clamp-4">
            &ldquo;{sourceA.quote}&rdquo;
          </p>
        </div>

        {/* VS badge */}
        <div className="flex items-center justify-center pt-4">
          <div className="w-8 h-8 rounded-full bg-lingar-surface2 flex items-center justify-center">
            <span className="text-[9px] font-bold text-lingar-ghost">VS</span>
          </div>
        </div>

        {/* Source B */}
        <div className="bg-lingar-surface2 rounded-xl p-3 space-y-1.5">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest truncate">
            {sourceB.name}
          </p>
          <p className="text-[11px] text-gray-300 leading-snug line-clamp-4">
            &ldquo;{sourceB.quote}&rdquo;
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center justify-between pt-1 border-t border-white/10">
        <span className="text-[10px] text-lingar-ghost">
          {Math.round(note.confidence_score * 100)}% confidence
        </span>
        <span className="text-[11px] text-lingar-gold font-medium">
          Explore Tension →
        </span>
      </div>
    </div>
  );
}
