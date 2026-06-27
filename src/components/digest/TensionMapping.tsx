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
  const sameSource = sourceA.name === sourceB.name;

  return (
    <div className="bg-lingar-surface rounded-2xl p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-lingar-surface2 border border-lingar-gold/30 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A050" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
              <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
              <path d="M7 21h10" /><path d="M12 3v18" />
              <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
            </svg>
          </div>
          <div>
            <p className="text-[18px] font-bold text-lingar-paper">Tension Mapping</p>
            <p className="text-[11px] text-gray-400">
              {sameSource ? "Conflicting angles from the same source." : "Different perspectives across sources."}
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-bold text-lingar-amber bg-lingar-amber/10 px-2 py-0.5 rounded-full shrink-0 mt-0.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Contradiction Alert
        </span>
      </div>

      {/* Ghost insight */}
      {note.title && (
        <p className="text-[12px] text-gray-300 leading-relaxed italic border-l-2 border-lingar-gold/40 pl-3">
          {note.title}
        </p>
      )}

      {/* Stacked source panels */}
      <div className="flex flex-col gap-2">
        <div className="bg-lingar-surface2 rounded-xl p-3 space-y-1">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
            {sameSource ? "Perspective A" : "Source A"}
          </p>
          {!sameSource && (
            <p className="text-[11px] font-semibold text-lingar-paper">{sourceA.name}</p>
          )}
          <p className="text-[12px] text-gray-300 leading-snug line-clamp-3">
            &ldquo;{sourceA.quote}&rdquo;
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] font-bold text-lingar-ghost">VS</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="bg-lingar-surface2 rounded-xl p-3 space-y-1">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
            {sameSource ? "Perspective B" : "Source B"}
          </p>
          {!sameSource && (
            <p className="text-[11px] font-semibold text-lingar-paper">{sourceB.name}</p>
          )}
          <p className="text-[12px] text-gray-300 leading-snug line-clamp-3">
            &ldquo;{sourceB.quote}&rdquo;
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center pt-1 border-t border-white/10">
        <span className="text-[12px] text-lingar-gold font-medium">Explore Tension &rsaquo;</span>
      </div>
    </div>
  );
}
