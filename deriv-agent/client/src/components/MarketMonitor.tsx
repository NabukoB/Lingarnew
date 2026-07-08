import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useMarketStore } from '../lib/store';
import { short } from '../lib/format';

interface Props {
  symbol: string | null;
}

export function MarketMonitor({ symbol }: Props) {
  const candles = useMarketStore((s) => (symbol ? s.candles[symbol] ?? [] : []));
  const signal = useMarketStore((s) => (symbol ? s.signals[symbol] : undefined));

  const data = useMemo(
    () =>
      candles.map((c) => ({
        time: new Date(c.epoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        close: c.close,
        high: c.high,
        low: c.low,
      })),
    [candles],
  );

  if (!symbol) {
    return (
      <section className="flex h-full items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-xs text-slate-500">
        Click a symbol in the heatmap to open its live chart.
      </section>
    );
  }

  return (
    <section className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="font-mono text-sm text-slate-200">{short(symbol)}</h2>
        {signal && (
          <span className="text-xs text-slate-400">
            score <span className="font-mono text-slate-100">{signal.compositeScore}</span> ·{' '}
            <span className={
              signal.direction === 'buy'
                ? 'text-emerald-300'
                : signal.direction === 'sell'
                  ? 'text-rose-300'
                  : 'text-slate-400'
            }>{signal.direction}</span>
          </span>
        )}
      </header>
      <div className="flex-1 min-h-[240px]">
        {data.length === 0 ? (
          <p className="text-xs text-slate-500">Streaming candles…</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 10 }} stroke="#334155" />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 10 }} stroke="#334155" />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }}
                labelStyle={{ color: '#cbd5e1' }}
              />
              <ReferenceLine y={data[data.length - 1]?.close} stroke="#334155" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="close" stroke="#10b981" dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
