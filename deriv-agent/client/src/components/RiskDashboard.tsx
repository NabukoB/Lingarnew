import { useMarketStore } from '../lib/store';
import { usd, pct } from '../lib/format';

export function RiskDashboard() {
  const balance = useMarketStore((s) => s.balance);
  const cycle = useMarketStore((s) => s.cycleStatus);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="mb-3 text-sm font-medium text-slate-200">Account & risk</h2>
      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-slate-400">Balance</dt>
        <dd className="text-right font-mono text-slate-100">
          {balance ? usd(balance.balance) : '—'}
        </dd>
        <dt className="text-slate-400">Cycle</dt>
        <dd className={`text-right font-mono ${cycle?.action?.includes('cooldown') ? 'text-orange-300' : 'text-slate-100'}`}>
          {cycle?.action ?? 'idle'}{cycle?.step ? ` · step ${cycle.step}` : ''}
        </dd>
        {cycle?.totalPnl !== undefined && (
          <>
            <dt className="text-slate-400">Cycle P&L</dt>
            <dd className={`text-right font-mono ${cycle.totalPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {pct((cycle.totalPnl / (balance?.balance ?? 1)) * 100)}
            </dd>
          </>
        )}
      </dl>
    </section>
  );
}
