import { useState } from 'react';
import { useMarketWebSocket } from './hooks/useMarketWebSocket';
import { useDevToken } from './hooks/useDevToken';
import { SignalHeatmap } from './components/SignalHeatmap';
import { ActiveTradeCard } from './components/ActiveTradeCard';
import { RiskDashboard } from './components/RiskDashboard';
import { ControlBar } from './components/ControlBar';
import { TradeLog } from './components/TradeLog';
import { MarketMonitor } from './components/MarketMonitor';
import { TickerPanel } from './components/TickerPanel';
import { ConfigPanel } from './components/ConfigPanel';

export function App() {
  const token = useDevToken('demo-user');
  const [focus, setFocus] = useState<string | null>(null);
  const { sendCommand } = useMarketWebSocket({ token });

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100">
      <header className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight">Deriv Agent</h1>
        <p className="text-xs text-slate-500">Volatility indices · Martingale · Multi-market recovery</p>
      </header>

      <ControlBar sendCommand={sendCommand} />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SignalHeatmap currentSymbol={focus ?? undefined} onSelect={setFocus} />
          <div className="h-[320px]">
            <MarketMonitor symbol={focus} />
          </div>
          <TradeLog />
        </div>
        <div className="space-y-4">
          <RiskDashboard />
          <ActiveTradeCard
            onCloseEarly={(contractId) => sendCommand({ type: 'close_early', contractId })}
            onSkip={(symbol) => sendCommand({ type: 'skip_signal', symbol })}
          />
          <TickerPanel symbol={focus} />
          <ConfigPanel />
        </div>
      </div>
    </div>
  );
}
