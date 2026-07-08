import { create } from 'zustand';

export interface TickPayload {
  symbol: string;
  bid: number;
  ask: number;
  epoch: number;
}
export interface OhlcPayload {
  symbol: string;
  granularity: number;
  open: number;
  high: number;
  low: number;
  close: number;
  epoch: number;
}
export interface SignalPayload {
  symbol: string;
  compositeScore: number;
  direction: 'buy' | 'sell' | 'neutral';
  contractType?: string;
  timestamp: number;
}
export interface TradePayload {
  action: 'placed' | 'settled' | 'cancelled';
  tradeId?: number;
  symbol?: string;
  contractType?: string;
  direction?: string;
  step?: number;
  stake?: number;
  payoutPercent?: number;
  outcome?: 'pending' | 'win' | 'loss';
  profit?: number;
  rejected?: boolean;
  reason?: string;
  timestamp: number;
}
export interface BalancePayload {
  balance: number;
  currency: string;
  timestamp: number;
}
export interface CyclePayload {
  action: string;
  cycleId?: number;
  step?: number;
  totalPnl?: number;
  symbol?: string;
  contractType?: string;
  timestamp: number;
}

interface State {
  connected: boolean;
  lastEventAt: number | null;
  ticks: Record<string, TickPayload>;
  candles: Record<string, OhlcPayload[]>;
  signals: Record<string, SignalPayload>;
  balance: BalancePayload | null;
  activeTrade: TradePayload | null;
  cycleStatus: CyclePayload | null;
  tradeLog: TradePayload[];
  interventionAck: { action: string; ts: number } | null;
  setConnected: (c: boolean) => void;
  onEvent: (msg: unknown) => void;
}

export const useMarketStore = create<State>((set, get) => ({
  connected: false,
  lastEventAt: null,
  ticks: {},
  candles: {},
  signals: {},
  balance: null,
  activeTrade: null,
  cycleStatus: null,
  tradeLog: [],
  interventionAck: null,
  setConnected: (c) => set({ connected: c }),
  onEvent: (msg) => {
    const m = msg as { type: string; timestamp?: number } & Record<string, unknown>;
    const ts = m.timestamp ?? Date.now();
    set({ lastEventAt: ts });
    switch (m.type) {
      case 'tick':
        set((s) => ({ ticks: { ...s.ticks, [m.symbol as string]: m as unknown as TickPayload } }));
        return;
      case 'ohlc': {
        const symbol = m.symbol as string;
        const prev = get().candles[symbol] ?? [];
        const c = m as unknown as OhlcPayload;
        const last = prev[prev.length - 1];
        const next = last && last.epoch === c.epoch ? [...prev.slice(0, -1), c] : [...prev, c];
        set({ candles: { ...get().candles, [symbol]: next.slice(-120) } });
        return;
      }
      case 'signal':
        set((s) => ({ signals: { ...s.signals, [m.symbol as string]: m as unknown as SignalPayload } }));
        return;
      case 'balance':
        set({ balance: m as unknown as BalancePayload });
        return;
      case 'trade': {
        const t = m as unknown as TradePayload;
        set((s) => ({
          activeTrade: t.action === 'placed' ? t : t.action === 'settled' ? null : s.activeTrade,
          tradeLog: [t, ...s.tradeLog].slice(0, 50),
        }));
        return;
      }
      case 'cycle':
        set({ cycleStatus: m as unknown as CyclePayload });
        return;
      case 'intervention_ack':
        set({ interventionAck: { action: m.action as string, ts } });
        return;
    }
  },
}));
