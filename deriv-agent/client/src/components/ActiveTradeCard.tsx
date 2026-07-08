import { useMarketStore } from '../lib/store';
import { usd, short } from '../lib/format';

interface Props {
  onCloseEarly?: (contractId: string) => void;
  onSkip?: (symbol: string) => void;
}

export function ActiveTradeCard({ onCloseEarly, onSkip }: Props) {
  const trade = useMarketStore((s) => s.activeTrade);
  const ticks = useMarketStore((s) => s.ticks);

  if (!trade || !trade.symbol) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-200">Active trade</h2>
        <p className="text-xs text-slate-500">No open contract.</p>
      </section>
    );
  }

  const tick = ticks[trade.symbol];
  const stake = trade.stake ?? 0;
  const payout = trade.payoutPercent ?? 0;
  const potential = stake * (payout / 100);

  return (
    <section className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-emerald-300">Active trade</h2>
        <span className="font-mono text-xs text-slate-400">
          {short(trade.symbol)} · step {trade.step ?? 1}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-slate-400">Contract</dt>
        <dd className="text-right font-mono text-slate-200">
          {trade.contractType} · {trade.direction}
        </dd>
        <dt className="text-slate-400">Stake</dt>
        <dd className="text-right font-mono text-slate-200">{usd(stake)}</dd>
        <dt className="text-slate-400">Payout</dt>
        <dd className="text-right font-mono text-slate-200">{payout.toFixed(1)}% → {usd(potential)}</dd>
        <dt className="text-slate-400">Live price</dt>
        <dd className="text-right font-mono text-slate-200">
          {tick ? tick.bid.toFixed(4) : '—'}
        </dd>
      </dl>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onCloseEarly?.(String(trade.tradeId ?? ''))}
          className="flex-1 rounded-md bg-rose-500/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-500"
        >
          Close early
        </button>
        <button
          onClick={() => trade.symbol && onSkip?.(trade.symbol)}
          className="flex-1 rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-600"
        >
          Skip signal
        </button>
      </div>
    </section>
  );
}
