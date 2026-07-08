import { useMarketStore } from '../lib/store';
import { scoreColor } from '../lib/colors';
import { short } from '../lib/format';

interface Props {
  currentSymbol?: string;
  onSelect?: (symbol: string) => void;
}

export function SignalHeatmap({ currentSymbol, onSelect }: Props) {
  const signals = useMarketStore((s) => s.signals);
  const entries = Object.values(signals).sort((a, b) => b.compositeScore - a.compositeScore);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-slate-200">Signal heatmap</h2>
        <span className="text-xs text-slate-500">{entries.length} symbols</span>
      </header>
      {entries.length === 0 ? (
        <p className="text-xs text-slate-500">Waiting for first evaluation…</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {entries.map((s) => (
            <button
              key={s.symbol}
              onClick={() => onSelect?.(s.symbol)}
              className={`group relative flex flex-col items-start rounded-lg p-2 text-left ring-1 ring-inset ring-slate-800 transition ${
                currentSymbol === s.symbol ? 'ring-emerald-400' : 'hover:ring-slate-600'
              } ${scoreColor(s.compositeScore)}/25`}
            >
              <span className="font-mono text-xs text-slate-100">{short(s.symbol)}</span>
              <span className="mt-1 text-lg font-semibold text-slate-50">{s.compositeScore}</span>
              <span className={`text-[10px] uppercase tracking-wide ${
                s.direction === 'buy' ? 'text-emerald-300' : s.direction === 'sell' ? 'text-rose-300' : 'text-slate-400'
              }`}>{s.direction}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
