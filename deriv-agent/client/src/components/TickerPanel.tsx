import { useMarketStore } from '../lib/store';
import { short } from '../lib/format';

interface Props {
  symbol: string | null;
}

export function TickerPanel({ symbol }: Props) {
  const tick = useMarketStore((s) => (symbol ? s.ticks[symbol] : undefined));
  const signal = useMarketStore((s) => (symbol ? s.signals[symbol] : undefined));

  if (!symbol) return null;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="mb-2 text-sm font-medium text-slate-200">Ticker — {short(symbol)}</h2>
      <dl className="grid grid-cols-2 gap-y-1 text-xs font-mono">
        <dt className="text-slate-400">Bid</dt>
        <dd className="text-right text-slate-100">{tick?.bid.toFixed(4) ?? '—'}</dd>
        <dt className="text-slate-400">Ask</dt>
        <dd className="text-right text-slate-100">{tick?.ask.toFixed(4) ?? '—'}</dd>
        <dt className="text-slate-400">Score</dt>
        <dd className="text-right text-slate-100">{signal?.compositeScore ?? '—'}</dd>
      </dl>
    </section>
  );
}
