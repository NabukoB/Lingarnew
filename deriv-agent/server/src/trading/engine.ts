import type { DerivClient } from '../deriv/client.js';
import type { ActiveSymbol, Candle, Granularity, Tick } from '../deriv/types.js';
import { CandleBuffer, seedCandles, subscribeCandles, subscribeTicks } from '../deriv/ticks.js';
import { subscribeBalance, fetchBalance } from '../deriv/balance.js';
import { discoverVolatilitySymbols } from '../deriv/symbols.js';
import { requestProposal, buyContract, sellContract } from '../deriv/proposal.js';
import { computeSignals, type ContractType, type SymbolSignals } from '../signals/engine.js';
import { selectContractType, type ContractPick } from '../signals/regime.js';
import { MartingaleController } from './martingale.js';
import { RiskGuard } from './risk-guard.js';
import { SettlementMonitor, type Settled } from './settlement-monitor.js';
import { chooseRecoveryMarket, rankRecoveryCandidates } from './recovery.js';
import * as db from '../db/queries.js';

export type EngineEventName =
  | 'tick'
  | 'ohlc'
  | 'signal'
  | 'trade'
  | 'balance'
  | 'cycle'
  | 'intervention_ack'
  | 'heartbeat'
  | 'error';

export interface EngineEvent {
  type: EngineEventName;
  payload: Record<string, unknown>;
  timestamp: number;
}

export type EngineListener = (e: EngineEvent) => void;

export type StopMode = 'immediate' | 'after_settlement' | 'after_cycle';

interface OpenTrade {
  tradeId: number;
  contractId: string;
  symbol: string;
  contractType: ContractType;
  direction: string;
  stake: number;
  step: number;
}

/**
 * Top-level orchestration. One instance per user.
 *
 * Lifecycle:
 *   const engine = new TradingEngine({ userId, client, ... });
 *   await engine.init();     // load config/state, subscribe streams
 *   engine.start();          // begin evaluating signals + placing trades
 *   engine.pause() / resume() / stop(mode);
 */
export class TradingEngine {
  private symbols: ActiveSymbol[] = [];
  private buffers = new Map<string, CandleBuffer>();
  private lastSignals = new Map<string, SymbolSignals>();
  private unsubs: Array<() => Promise<void>> = [];
  private listeners = new Set<EngineListener>();
  private paused = false;
  private stopRequested: StopMode | null = null;
  private open: OpenTrade | null = null;
  private cycleId: number | null = null;
  private blacklist = new Map<string, number>(); // symbol -> expiry epoch
  private evalTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly userId: string,
    private readonly client: DerivClient,
    private readonly martingale: MartingaleController,
    private readonly risk: RiskGuard,
    private readonly settlement: SettlementMonitor,
    private readonly cfg: {
      buyThreshold: number;
      sellThreshold: number;
      demoMode: boolean;
      enableRecoveryMarketSwitching: boolean;
      maxRecoverySwitchesPerCycle: number;
      recoveryMarketMinSignalScore: number;
      recoveryMarketPreference: 'highest_score' | 'same_symbol' | 'disabled';
      contractDurationTicks: number;
      currency: string;
    },
  ) {}

  on(listener: EngineListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(type: EngineEventName, payload: Record<string, unknown>) {
    const e: EngineEvent = { type, payload, timestamp: Date.now() };
    for (const l of this.listeners) {
      try {
        l(e);
      } catch (err) {
        console.error('[engine] listener error', err);
      }
    }
  }

  /** Discover symbols, seed buffers, subscribe streams. */
  async init(): Promise<void> {
    this.symbols = await discoverVolatilitySymbols(this.client);
    for (const s of this.symbols) {
      const buf = new CandleBuffer(200);
      const seed = await seedCandles(this.client, s.symbol, 60, 100);
      seed.forEach((c) => buf.push(c));
      this.buffers.set(s.symbol, buf);

      const unsubCandle = await subscribeCandles(this.client, s.symbol, 60, (c) => this.onCandle(c));
      const unsubTick = await subscribeTicks(this.client, s.symbol, (t) => this.onTick(t));
      this.unsubs.push(unsubCandle, unsubTick);
    }
    const unsubBal = await subscribeBalance(this.client, (b) => {
      this.risk.setBalance(b.balance);
      this.emit('balance', { balance: b.balance, currency: b.currency });
    });
    this.unsubs.push(unsubBal);

    // Resume active cycle if one exists.
    const active = await db.getActiveCycle(this.userId);
    if (active) {
      this.cycleId = active.id;
      this.martingale.restore({
        step: active.step === 0 ? 1 : active.step,
        currentStake: 0,
        totalStaked: Number(active.total_staked),
        totalPnl: Number(active.total_pnl),
        status: 'active',
      });
      this.emit('cycle', { action: 'resumed', cycleId: active.id, step: active.step });
    }
  }

  start() {
    if (this.evalTimer) return;
    // Evaluate every candle close (~1s poll is fine because we ignore
    // duplicates via buffer size checks).
    this.evalTimer = setInterval(() => this.evaluate().catch((err) => this.emit('error', { message: (err as Error).message })), 5_000);
  }

  async shutdown() {
    if (this.evalTimer) clearInterval(this.evalTimer);
    this.evalTimer = null;
    for (const fn of this.unsubs) await fn().catch(() => {});
    this.settlement.stop();
  }

  // ----- Intervention API -------------------------------------------------

  pause() {
    this.paused = true;
    this.emit('intervention_ack', { action: 'pause' });
  }

  resume() {
    this.paused = false;
    this.emit('intervention_ack', { action: 'resume' });
  }

  async stop(mode: StopMode) {
    this.stopRequested = mode;
    this.emit('intervention_ack', { action: 'stop', mode });
    if (mode === 'immediate' && this.open) {
      await this.closeOpenContractEarly(this.open.contractId).catch(() => {});
    }
    if (mode === 'immediate') await this.shutdown();
  }

  skipSignal(symbol: string, blacklistMinutes = 5) {
    this.blacklist.set(symbol, Date.now() + blacklistMinutes * 60_000);
    this.emit('intervention_ack', { action: 'skip_signal', symbol, blacklistMinutes });
  }

  /** Public hook so intervention handlers can emit acks without accessing internals. */
  ackIntervention(action: string, extra: Record<string, unknown> = {}) {
    this.emit('intervention_ack', { action, ...extra });
  }

  async closeOpenContractEarly(contractId: string): Promise<void> {
    if (!this.open || this.open.contractId !== contractId) return;
    try {
      const { soldFor } = await sellContract(this.client, contractId, 0);
      // Compute profit as sold_for - buy_price (stake).
      const profit = soldFor - this.open.stake;
      await db.settleTrade(this.open.tradeId, {
        outcome: profit >= 0 ? 'win' : 'loss',
        profit,
        closed_early: true,
      });
      await this.finishSettlement({
        contractId,
        outcome: profit >= 0 ? 'win' : 'loss',
        profit,
        payout: soldFor,
      });
      this.emit('intervention_ack', { action: 'close_early', contractId, profit });
    } catch (err) {
      this.emit('error', { message: (err as Error).message });
    }
  }

  // ----- Core evaluate loop ----------------------------------------------

  private async evaluate() {
    // Compute signals for every ready symbol, publish to the UI, then only
    // continue to trade-selection if the engine is in a state that allows it.
    const all = [...this.buffers.entries()]
      .map(([symbol, buf]) =>
        computeSignals(symbol, buf.toArray(), {
          buyThreshold: this.cfg.buyThreshold,
          sellThreshold: this.cfg.sellThreshold,
        }),
      );
    for (const sig of all) {
      this.lastSignals.set(sig.symbol, sig);
      const pick = selectContractType(sig);
      if (pick) {
        this.emit('signal', {
          symbol: sig.symbol,
          compositeScore: pick.compositeScore,
          direction: pick.direction,
          contractType: pick.contractType,
        });
      }
    }

    if (this.paused || this.open || this.stopRequested) return;
    const canOpen = this.risk.canOpenCycle();
    if (!canOpen.allowed) return;

    // For a fresh cycle, take the best pick across all symbols.
    let entry: { symbol: string; pick: ContractPick } | null = null;
    if (!this.cycleId) {
      const picks = all
        .map((sig) => ({ symbol: sig.symbol, pick: selectContractType(sig) }))
        .filter((x): x is { symbol: string; pick: ContractPick } => x.pick !== null);
      picks.sort((a, b) => b.pick.compositeScore - a.pick.compositeScore);
      const now = Date.now();
      const filtered = picks.filter((p) => (this.blacklist.get(p.symbol) ?? 0) <= now);
      const best = filtered[0];
      if (!best || best.pick.direction === 'neutral') return;
      entry = best;
    } else {
      // Mid-cycle after a loss: consider recovery.
      const currentSymbol = this.currentCycleSymbol();
      const originalSig = this.lastSignals.get(currentSymbol);
      const originalScore = originalSig ? selectContractType(originalSig)?.compositeScore ?? 0 : 0;
      const candidates = rankRecoveryCandidates(all, {
        currentSymbol,
        previousSymbolsUsed: [currentSymbol],
        minSignalScore: this.cfg.recoveryMarketMinSignalScore,
        maxSwitchesPerCycle: this.cfg.maxRecoverySwitchesPerCycle,
        switchesSoFar: 0,
        preference: this.cfg.recoveryMarketPreference,
      });
      const chosen = this.cfg.enableRecoveryMarketSwitching
        ? chooseRecoveryMarket(candidates, originalScore)
        : null;
      if (chosen) {
        entry = { symbol: chosen.symbol, pick: chosen.pick };
      } else if (originalSig) {
        const pick = selectContractType(originalSig);
        if (!pick || pick.direction === 'neutral') return;
        entry = { symbol: currentSymbol, pick };
      } else {
        return;
      }
    }

    if (!entry) return;
    // Cycle risk cap pre-check.
    const capCheck = this.risk.checkCycleRiskCap(this.martingale, this.martingale.state().currentStake || 1, 1.5, 4);
    if (!capCheck.allowed) {
      this.emit('trade', { rejected: true, reason: capCheck.reason });
      return;
    }
    await this.placeTrade(entry.symbol, entry.pick);
  }

  private currentCycleSymbol(): string {
    // Fall back to first symbol if no cycle context is tracked yet.
    return this.symbols[0]?.symbol ?? 'R_100';
  }

  private async placeTrade(symbol: string, pick: ContractPick) {
    if (this.open || this.stopRequested) return;
    // Ensure a cycle exists.
    if (!this.cycleId) {
      const row = await db.createCycle(this.userId, symbol, pick.contractType);
      this.cycleId = row.id;
      this.martingale.beginCycle(this.martingale.state().currentStake || undefined);
      this.emit('cycle', { action: 'started', cycleId: row.id, symbol, contractType: pick.contractType });
    }

    const state = this.martingale.state();
    const stake = state.currentStake;
    const derivContractType = mapContractType(pick.contractType, pick.direction);
    if (!derivContractType) {
      this.emit('trade', { rejected: true, reason: 'no derivative contract type for neutral' });
      return;
    }

    try {
      const proposal = await requestProposal(this.client, {
        symbol,
        contractType: derivContractType,
        amount: stake,
        duration: this.cfg.contractDurationTicks,
        durationUnit: 't',
        currency: this.cfg.currency,
      });
      const payoutOk = this.risk.checkPayout(proposal.payoutPercent);
      if (!payoutOk.allowed) {
        this.emit('trade', { rejected: true, reason: payoutOk.reason });
        return;
      }
      const buy = await buyContract(this.client, proposal.id, proposal.askPrice);
      const trade = await db.insertTrade({
        user_id: this.userId,
        cycle_id: this.cycleId!,
        step: state.step,
        symbol,
        contract_type: pick.contractType,
        direction: pick.direction,
        stake,
        payout_percent: proposal.payoutPercent,
        proposal_id: proposal.id,
        contract_id: buy.contractId,
        entry_price: proposal.spot,
        signal_score: pick.compositeScore,
      });
      this.open = {
        tradeId: trade.id,
        contractId: buy.contractId,
        symbol,
        contractType: pick.contractType,
        direction: pick.direction,
        stake,
        step: state.step,
      };
      this.emit('trade', {
        action: 'placed',
        tradeId: trade.id,
        symbol,
        contractType: pick.contractType,
        direction: pick.direction,
        stake,
        step: state.step,
        payoutPercent: proposal.payoutPercent,
      });
      this.settlement.watch(buy.contractId, (s) => this.onSettlement(s).catch(() => {}));
    } catch (err) {
      this.emit('error', { message: (err as Error).message });
    }
  }

  private async onSettlement(s: Settled) {
    if (!this.open || this.open.contractId !== s.contractId) return;
    const openInfo = this.open;
    await db.settleTrade(openInfo.tradeId, {
      outcome: s.outcome,
      profit: s.profit,
    });
    await this.finishSettlement(s);
  }

  private async finishSettlement(s: Settled) {
    if (!this.open) return;
    const openInfo = this.open;
    this.open = null;
    const stake = openInfo.stake;
    const payoutPct = openInfo.stake > 0 ? (Math.abs(s.profit) / stake) * 100 : 0;
    const result = this.martingale.recordTrade(s.outcome, stake, payoutPct);
    const limits = this.risk.updateAfterTrade(s.profit);
    if (this.cycleId) {
      await db.updateCycle(this.cycleId, {
        step: result.next.step,
        total_staked: result.next.totalStaked,
        total_pnl: result.next.totalPnl,
      });
    }
    this.emit('trade', {
      action: 'settled',
      tradeId: openInfo.tradeId,
      symbol: openInfo.symbol,
      outcome: s.outcome,
      profit: s.profit,
      step: openInfo.step,
    });
    if (result.cycleEnded) {
      if (this.cycleId) {
        await db.endCycle(this.cycleId, result.outcomeSummary === 'cycle_won' ? 'won' : 'failed');
        this.emit('cycle', {
          action: result.outcomeSummary,
          cycleId: this.cycleId,
          totalPnl: result.next.totalPnl,
        });
      }
      this.cycleId = null;
      if (result.outcomeSummary === 'cycle_failed') {
        this.risk.startCooldown();
        this.emit('cycle', { action: 'cooldown_started' });
      }
    }
    if (limits.lossHit) this.emit('cycle', { action: 'daily_loss_hit' });
    if (limits.profitHit) this.emit('cycle', { action: 'daily_profit_hit' });
    if (this.stopRequested === 'after_settlement' || (this.stopRequested === 'after_cycle' && result.cycleEnded)) {
      await this.shutdown();
    }
  }

  private onTick(t: Tick) {
    this.emit('tick', { symbol: t.symbol, bid: t.bid, ask: t.ask, epoch: t.epoch });
  }

  private onCandle(c: Candle) {
    const buf = this.buffers.get(c.symbol);
    if (buf) buf.push(c);
    this.emit('ohlc', {
      symbol: c.symbol,
      granularity: c.granularity,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      epoch: c.epoch,
    });
  }
}

function mapContractType(kind: ContractType, direction: 'buy' | 'sell' | 'neutral'): string | null {
  if (direction === 'neutral') return null;
  if (kind === 'rise_fall') return direction === 'buy' ? 'CALL' : 'PUT';
  if (kind === 'higher_lower') return direction === 'buy' ? 'CALLE' : 'PUTE';
  if (kind === 'digits') return direction === 'buy' ? 'DIGITOVER' : 'DIGITUNDER';
  return null;
}
