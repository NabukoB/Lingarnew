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

function IconCircle({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-11 h-11 rounded-full bg-lingar-surface2 border border-lingar-gold/30 flex items-center justify-center shrink-0">
      {children}
    </div>
  );
}

interface Props {
  healthPct: number;
  insightCount: number;
  opportunityCount: number;
}

export function StatsRow({ healthPct, insightCount, opportunityCount }: Props) {
  const displayPct = Math.min(healthPct, 100);

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Knowledge Health */}
      <div className="bg-lingar-surface rounded-2xl p-3 flex flex-col gap-2">
        <IconCircle>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A050" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.16z" />
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.16z" />
          </svg>
        </IconCircle>
        <p className="text-[10px] text-lingar-ghost leading-snug">Knowledge Health</p>
        <p className="text-[28px] font-bold text-lingar-paper leading-none">{displayPct}%</p>
        <div className="h-1 bg-lingar-surface2 rounded-full overflow-hidden">
          <div
            className="h-full bg-lingar-gold rounded-full transition-all"
            style={{ width: `${displayPct}%` }}
          />
        </div>
      </div>

      {/* New Insights */}
      <div className="bg-lingar-surface rounded-2xl p-3 flex flex-col gap-2">
        <IconCircle>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A050" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.8-1.6 5.2-4 6.4V17H9v-1.6A7 7 0 0 1 5 9a7 7 0 0 1 7-7z" />
          </svg>
        </IconCircle>
        <p className="text-[10px] text-lingar-ghost leading-snug">New Insights</p>
        <p className="text-[28px] font-bold text-lingar-paper leading-none">{insightCount}</p>
        <Squiggle />
      </div>

      {/* Active Opportunities */}
      <div className="bg-lingar-surface rounded-2xl p-3 flex flex-col gap-2">
        <IconCircle>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A050" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        </IconCircle>
        <p className="text-[10px] text-lingar-ghost leading-snug">Active Opps</p>
        <p className="text-[28px] font-bold text-lingar-paper leading-none">{opportunityCount}</p>
        <Squiggle />
      </div>
    </div>
  );
}
