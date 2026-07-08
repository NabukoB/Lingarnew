import { useEffect, useState } from 'react';

interface Config {
  trading_enabled: boolean;
  account_tier: number;
  martingale_multiplier: number;
  buy_threshold: number;
  sell_threshold: number;
  enable_recovery_market_switching: boolean;
}

export function ConfigPanel() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Placeholder: tRPC hook to be wired up. For now, static defaults.
    setCfg({
      trading_enabled: false,
      account_tier: 100,
      martingale_multiplier: 1.5,
      buy_threshold: 70,
      sell_threshold: 30,
      enable_recovery_market_switching: true,
    });
  }, []);

  if (!cfg) return null;
  const save = async (patch: Partial<Config>) => {
    setSaving(true);
    setCfg({ ...cfg, ...patch });
    // TODO: POST to /api/trpc/config.update
    setSaving(false);
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="mb-3 text-sm font-medium text-slate-200">Configuration</h2>
      <div className="space-y-3 text-sm">
        <label className="flex items-center justify-between">
          <span className="text-slate-300">Master toggle</span>
          <button
            onClick={() => save({ trading_enabled: !cfg.trading_enabled })}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
              cfg.trading_enabled ? 'bg-emerald-500' : 'bg-slate-600'
            }`}
            disabled={saving}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                cfg.trading_enabled ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </label>
        <label className="flex items-center justify-between">
          <span className="text-slate-300">Account tier</span>
          <select
            value={cfg.account_tier}
            onChange={(e) => save({ account_tier: Number(e.target.value) })}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
          >
            <option value={100}>$100</option>
            <option value={250}>$250</option>
            <option value={500}>$500</option>
            <option value={1000}>$1,000</option>
          </select>
        </label>
        <label className="flex items-center justify-between">
          <span className="text-slate-300">Multiplier ({cfg.martingale_multiplier}×)</span>
          <input
            type="range"
            min={1.3}
            max={2.0}
            step={0.1}
            value={cfg.martingale_multiplier}
            onChange={(e) => save({ martingale_multiplier: Number(e.target.value) })}
            className="w-24"
          />
        </label>
        <label className="flex items-center justify-between">
          <span className="text-slate-300">Buy / sell thresholds</span>
          <span className="text-xs text-slate-400 font-mono">
            {cfg.buy_threshold} / {cfg.sell_threshold}
          </span>
        </label>
        <label className="flex items-center justify-between">
          <span className="text-slate-300">Recovery switching</span>
          <button
            onClick={() => save({ enable_recovery_market_switching: !cfg.enable_recovery_market_switching })}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
              cfg.enable_recovery_market_switching ? 'bg-emerald-500' : 'bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                cfg.enable_recovery_market_switching ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </label>
      </div>
    </section>
  );
}
