function Squiggle() {
  return (
    <svg width="56" height="14" viewBox="0 0 56 14" fill="none" aria-hidden="true">
      <path
        d="M0 7 Q7 1 14 7 Q21 13 28 7 Q35 1 42 7 Q49 13 56 7"
        stroke="#C9A050"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.45"
      />
    </svg>
  );
}

interface Props {
  healthPct: number;
  insightCount: number;
  opportunityCount: number;
}

export function StatsRow({ healthPct, insightCount, opportunityCount }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Knowledge Health */}
      <div className="bg-lingar-surface rounded-2xl p-3 flex flex-col gap-2">
        <div className="w-8 h-8 rounded-xl bg-lingar-surface2 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A050" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a5 5 0 0 1 5 5c0 1.5-.5 2.8-1.4 3.8A4 4 0 0 1 16 14c0 2.2-1.8 4-4 4s-4-1.8-4-4a4 4 0 0 1 .4-3.2A5 5 0 0 1 7 7a5 5 0 0 1 5-5z" />
          </svg>
        </div>
        <p className="text-[10px] text-lingar-ghost leading-snug">Knowledge Health</p>
        <p className="text-[22px] font-bold text-lingar-paper leading-none">{healthPct}%</p>
        <div className="h-1 bg-lingar-surface2 rounded-full overflow-hidden">
          <div
            className="h-full bg-lingar-gold rounded-full transition-all"
            style={{ width: `${Math.min(healthPct, 100)}%` }}
          />
        </div>
      </div>

      {/* New Insights */}
      <div className="bg-lingar-surface rounded-2xl p-3 flex flex-col gap-2">
        <div className="w-8 h-8 rounded-xl bg-lingar-surface2 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A050" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.8-1.6 5.2-4 6.4V17H9v-1.6A7 7 0 0 1 5 9a7 7 0 0 1 7-7z" />
          </svg>
        </div>
        <p className="text-[10px] text-lingar-ghost leading-snug">New Insights</p>
        <p className="text-[22px] font-bold text-lingar-paper leading-none">{insightCount}</p>
        <Squiggle />
      </div>

      {/* Active Opportunities */}
      <div className="bg-lingar-surface rounded-2xl p-3 flex flex-col gap-2">
        <div className="w-8 h-8 rounded-xl bg-lingar-surface2 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A050" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        </div>
        <p className="text-[10px] text-lingar-ghost leading-snug">Active Opportunities</p>
        <p className="text-[22px] font-bold text-lingar-paper leading-none">{opportunityCount}</p>
        <Squiggle />
      </div>
    </div>
  );
}
