export interface MartingaleConfig {
  initialStake: number;
  multiplier: number;    // 1.3 - 2.0
  maxSteps: number;      // 4 - 5
}

export interface CycleState {
  step: number;                 // 1-indexed; 0 = no active cycle
  currentStake: number;
  totalStaked: number;
  totalPnl: number;
  status: 'idle' | 'active' | 'won' | 'failed';
}

export type TradeOutcome = 'win' | 'loss';

export interface RecordResult {
  next: CycleState;
  cycleEnded: boolean;
  outcomeSummary: 'cycle_won' | 'cycle_failed' | 'step_advanced';
}

/**
 * Stateful controller for a single Martingale cycle. Persist `state()` after
 * every event; on restart call restore() with the persisted value.
 */
export class MartingaleController {
  private s: CycleState;

  constructor(private readonly cfg: MartingaleConfig, initial?: CycleState) {
    this.s = initial ?? this.freshState();
  }

  static freshFor(cfg: MartingaleConfig): MartingaleController {
    return new MartingaleController(cfg);
  }

  state(): CycleState {
    return { ...this.s };
  }

  restore(state: CycleState) {
    this.s = { ...state };
  }

  /** Total capital at risk if we go all the way to maxSteps starting at initialStake. */
  totalRiskForFullCycle(): number {
    let stake = this.cfg.initialStake;
    let total = 0;
    for (let i = 0; i < this.cfg.maxSteps; i++) {
      total += stake;
      stake = round2(stake * this.cfg.multiplier);
    }
    return round2(total);
  }

  /** Total capital already at risk for the current cycle. */
  totalStaked(): number {
    return this.s.totalStaked;
  }

  /** Start the next cycle at step 1, with a possibly auto-scaled initial stake. */
  beginCycle(initialStake = this.cfg.initialStake): CycleState {
    this.s = {
      step: 1,
      currentStake: round2(initialStake),
      totalStaked: 0,
      totalPnl: 0,
      status: 'active',
    };
    return this.state();
  }

  /**
   * Break-even payout percent required at the current step to fully recover
   * the cycle's cumulative loss when this step wins. Returns null when no
   * cycle is active.
   */
  breakEvenPayoutPct(): number | null {
    if (this.s.status !== 'active') return null;
    // We need: stake_now * (payout_pct/100) >= totalStaked_before_this_step
    const cumBefore = this.s.totalStaked;
    if (this.s.currentStake === 0) return null;
    return round2((cumBefore / this.s.currentStake) * 100);
  }

  /**
   * Record the outcome of the current step and return the next state.
   * `stake` and `payoutPercent` are what actually cleared on the exchange.
   */
  recordTrade(outcome: TradeOutcome, stake: number, payoutPercent: number): RecordResult {
    if (this.s.status !== 'active') {
      throw new Error('recordTrade called with no active cycle');
    }

    // Update running totals.
    const profit = outcome === 'win' ? stake * (payoutPercent / 100) : -stake;
    this.s.totalStaked = round2(this.s.totalStaked + stake);
    this.s.totalPnl = round2(this.s.totalPnl + profit);

    if (outcome === 'win') {
      this.s.status = 'won';
      return {
        next: this.state(),
        cycleEnded: true,
        outcomeSummary: 'cycle_won',
      };
    }

    // Loss — advance step or fail.
    if (this.s.step >= this.cfg.maxSteps) {
      this.s.status = 'failed';
      return {
        next: this.state(),
        cycleEnded: true,
        outcomeSummary: 'cycle_failed',
      };
    }
    this.s.step += 1;
    this.s.currentStake = round2(this.s.currentStake * this.cfg.multiplier);
    return {
      next: this.state(),
      cycleEnded: false,
      outcomeSummary: 'step_advanced',
    };
  }

  private freshState(): CycleState {
    return {
      step: 0,
      currentStake: 0,
      totalStaked: 0,
      totalPnl: 0,
      status: 'idle',
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
