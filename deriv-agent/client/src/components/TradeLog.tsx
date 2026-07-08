import { useMarketStore } from '../lib/store';
import { usd, short, timeAgo } from '../lib/format';

export function TradeLog() {
  const log = useMarketStore((s) => s.tradeLog);
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="mb-3 text-sm font-medium text-slate-200">Trade log</h2>
      {log.length === 0 ? (
        <p className="text-xs text-slate-500">No trades yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-slate-400">
              <tr>
                <th className="py-1 pr-3">When</th>
                <th className="pr-3">Symbol</th>
                <th className="pr-3">Kind</th>
                <th className="pr-3">Stake</th>
                <th className="pr-3">Outcome</th>
                <th className="pr-3">P&amp;L</th>
              </tr>
            </thead>
            <tbody className="font-mono text-slate-200">
              {log.map((t, i) => (
                <tr key={i} className="border-t border-slate-800/60">
                  <td className="py-1 pr-3 text-slate-400">{timeAgo(t.timestamp)}</td>
                  <td className="pr-3">{t.symbol ? short(t.symbol) : '—'}</td>
                  <td className="pr-3 text-slate-400">
                    {t.contractType ?? '—'} · {t.direction ?? '—'}
                  </td>
                  <td className="pr-3">{t.stake !== undefined ? usd(t.stake) : '—'}</td>
                  <td
                    className={`pr-3 ${
                      t.outcome === 'win' ? 'text-emerald-300' : t.outcome === 'loss' ? 'text-rose-300' : 'text-slate-400'
                    }`}
                  >
                    {t.action === 'placed' ? 'placed' : t.outcome ?? '—'}
                  </td>
                  <td className={`pr-3 ${t.profit && t.profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {t.profit !== undefined ? usd(t.profit) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
