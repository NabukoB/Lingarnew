export interface RiskConfig {
  dailyLossLimitPct: number;      // e.g. 10 → stop at -10% of dailyStartingBalance
  dailyProfitTargetPct: number;   // e.g. 15 → stop at +15% of dailyStartingBalance
  cooldownMinutes: number;
  cycleRiskCapPct: number;        // e.g. 20 → cycle's total possible stake ≤ 20% of balance
  minPayoutPct: number;           // reject proposals below this payout%
}

export interface AccountRiskState {
  balance: number;
  dailyStartingBalance: number;
  dailyPnl: number;
  dailyLossHit: boolean;
  dailyProfitHit: boolean;
  cooldownUntil: number | null;   // epoch ms
  lastResetDate: string;          // ISO yyyy-mm-dd (UTC)
}

export interface TradeDecision {
  allowed: boolean;
  reason?: string;
}

export interface CycleRiskCheck {
  allowed: boolean;
  scaledInitialStake?: number;
  totalRisk: number;
  cap: number;
  reason?: string;
}

/**
 * Enforces daily limits, cooldowns, and cycle-level capital caps. State is
 * driven from the outside (persisted) and read/mutated through this class.
 */
export class RiskGuard {
  constructor(private readonly cfg: RiskConfig, private s: AccountRiskState) {}

  state(): AccountRiskState {
    return { ...this.s };
  }

  setBalance(balance: number) {
    this.s.balance = balance;
  }

  /** Called at the start of every trading day (00:00 UTC). */
  resetDailyLimits(currentBalance: number, today: string) {
    this.s.dailyStartingBalance = currentBalance;
    this.s.balance = currentBalance;
    this.s.dailyPnl = 0;
    this.s.dailyLossHit = false;
    this.s.dailyProfitHit = false;
    this.s.lastResetDate = today;
  }

  /** Update after a settled trade. Returns true if daily limits just tripped. */
  updateAfterTrade(profit: number): { lossHit: boolean; profitHit: boolean } {
    this.s.dailyPnl += profit;
    this.s.balance += profit;
    const lossCap = -this.s.dailyStartingBalance * (this.cfg.dailyLossLimitPct / 100);
    const profitCap = this.s.dailyStartingBalance * (this.cfg.dailyProfitTargetPct / 100);
    const lossHit = this.s.dailyPnl <= lossCap;
    const profitHit = this.s.dailyPnl >= profitCap;
    if (lossHit) this.s.dailyLossHit = true;
    if (profitHit) this.s.dailyProfitHit = true;
    return { lossHit, profitHit };
  }

  startCooldown(now = Date.now()) {
    this.s.cooldownUntil = now + this.cfg.cooldownMinutes * 60_000;
  }

  endCooldown() {
    this.s.cooldownUntil = null;
  }

  isCoolingDown(now = Date.now()): boolean {
    return this.s.cooldownUntil !== null && this.s.cooldownUntil > now;
  }

  cooldownRemainingMs(now = Date.now()): number {
    return this.s.cooldownUntil ? Math.max(0, this.s.cooldownUntil - now) : 0;
  }

  /** Can we open a new cycle right now? */
  canOpenCycle(now = Date.now()): TradeDecision {
    if (this.s.dailyLossHit) return { allowed: false, reason: 'daily loss limit reached' };
    if (this.s.dailyProfitHit) return { allowed: false, reason: 'daily profit target reached' };
    if (this.isCoolingDown(now)) return { allowed: false, reason: 'cooldown active' };
    if (this.s.balance <= 0) return { allowed: false, reason: 'insufficient balance' };
    return { allowed: true };
  }

  /**
   * Pre-check that the *entire* cycle's worst-case total stake fits inside
   * cycleRiskCapPct of current balance. If it doesn't, auto-scale down the
   * initial stake so it just fits — unless doing so would push the initial
   * stake below the exchange minimum (0.35).
   */
  checkCycleRiskCap(martingale: {
    totalRiskForFullCycle(): number;
  }, initialStake: number, multiplier: number, maxSteps: number): CycleRiskCheck {
    const cap = this.s.balance * (this.cfg.cycleRiskCapPct / 100);
    const totalRisk = martingale.totalRiskForFullCycle();
    if (totalRisk <= cap) {
      return { allowed: true, totalRisk, cap };
    }
    // scale factor = cap / totalRisk → applied to initialStake keeps ratios.
    // Round *down* so we never nudge total risk above the cap.
    const factor = cap / totalRisk;
    const scaled = floor2(initialStake * factor);
    if (scaled < 0.35) {
      return {
        allowed: false,
        totalRisk,
        cap,
        reason: 'cycle would exceed risk cap even at minimum stake',
      };
    }
    // Recompute total risk from scaled initial.
    let stake = scaled;
    let sum = 0;
    for (let i = 0; i < maxSteps; i++) {
      sum += stake;
      stake = round2(stake * multiplier);
    }
    return {
      allowed: true,
      scaledInitialStake: scaled,
      totalRisk: round2(sum),
      cap,
    };
  }

  /** Reject proposals whose payout% is below the configured floor. */
  checkPayout(payoutPct: number): TradeDecision {
    if (payoutPct < this.cfg.minPayoutPct) {
      return {
        allowed: false,
        reason: `payout ${payoutPct.toFixed(1)}% below minimum ${this.cfg.minPayoutPct}%`,
      };
    }
    return { allowed: true };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function floor2(n: number): number {
  return Math.floor(n * 100) / 100;
}
