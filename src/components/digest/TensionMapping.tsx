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
          <div className="w-11 h-11 rounded-full bg-lingar-surface2 border border-lingar-gold/30 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A050" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3L5 8v2c0 5.25 3.5 10.17 7 11.5C16.5 20.17 20 15.25 20 10V8L12 3z" />
              <path d="M8 12l3 3 5-5" />
            </svg>
          </div>
          <div>
            <p className="text-[15px] font-bold text-lingar-paper leading-snug">Tension Mapping</p>
            <p className="text-[11px] text-gray-400">Different perspectives detected across sources.</p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-bold text-lingar-amber bg-lingar-amber/10 px-2 py-0.5 rounded-full shrink-0 mt-0.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>Contradiction Alert</span>
        </span>
      </div>

      {/* VS layout */}
      <div className="grid grid-cols-[1fr_32px_1fr] gap-2 items-start">
        {/* Source A */}
        <div className="bg-lingar-surface2 rounded-xl p-3 space-y-1.5">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Source A</p>
          <p className="text-[12px] font-semibold text-lingar-paper truncate">{sourceA.name}</p>
          <p className="text-[11px] text-gray-300 leading-snug line-clamp-4">
            &ldquo;{sourceA.quote}&rdquo;
          </p>
        </div>

        {/* VS badge */}
        <div className="flex items-center justify-center pt-5">
          <div className="w-8 h-8 rounded-full bg-lingar-dark border border-white/10 flex items-center justify-center">
            <span className="text-[9px] font-bold text-lingar-ghost">VS</span>
          </div>
        </div>

        {/* Source B */}
        <div className="bg-lingar-surface2 rounded-xl p-3 space-y-1.5">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Source B</p>
          <p className="text-[12px] font-semibold text-lingar-paper truncate">{sourceB.name}</p>
          <p className="text-[11px] text-gray-300 leading-snug line-clamp-4">
            &ldquo;{sourceB.quote}&rdquo;
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center justify-center pt-1 border-t border-white/10">
        <span className="text-[12px] text-lingar-gold font-medium">
          Explore Tension &rsaquo;
        </span>
      </div>
    </div>
  );
}
