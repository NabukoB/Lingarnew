import { describe, expect, it } from 'vitest';
import { RiskGuard } from '../src/trading/risk-guard.js';
import { MartingaleController } from '../src/trading/martingale.js';

const CFG = {
  dailyLossLimitPct: 10,
  dailyProfitTargetPct: 15,
  cooldownMinutes: 30,
  cycleRiskCapPct: 20,
  minPayoutPct: 75,
};

function newGuard() {
  return new RiskGuard(CFG, {
    balance: 100,
    dailyStartingBalance: 100,
    dailyPnl: 0,
    dailyLossHit: false,
    dailyProfitHit: false,
    cooldownUntil: null,
    lastResetDate: '2026-07-08',
  });
}

describe('RiskGuard daily limits', () => {
  it('trips loss limit at -10% of daily starting balance', () => {
    const g = newGuard();
    const r = g.updateAfterTrade(-10);
    expect(r.lossHit).toBe(true);
    expect(g.canOpenCycle().allowed).toBe(false);
  });

  it('trips profit target at +15% of daily starting balance', () => {
    const g = newGuard();
    const r = g.updateAfterTrade(15);
    expect(r.profitHit).toBe(true);
    expect(g.canOpenCycle().allowed).toBe(false);
  });

  it('does not trip within limits', () => {
    const g = newGuard();
    const r = g.updateAfterTrade(5);
    expect(r.lossHit).toBe(false);
    expect(r.profitHit).toBe(false);
    expect(g.canOpenCycle().allowed).toBe(true);
  });
});

describe('RiskGuard cooldown', () => {
  it('blocks new cycles during cooldown', () => {
    const g = newGuard();
    const now = Date.now();
    g.startCooldown(now);
    expect(g.canOpenCycle(now + 60_000).allowed).toBe(false);
  });
  it('clears when time elapses', () => {
    const g = newGuard();
    const now = Date.now();
    g.startCooldown(now);
    expect(g.canOpenCycle(now + 31 * 60_000).allowed).toBe(true);
  });
});

describe('RiskGuard cycle cap', () => {
  it('passes when total risk within cap', () => {
    const g = newGuard();  // balance 100, cap 20
    const m = new MartingaleController({ initialStake: 1, multiplier: 1.5, maxSteps: 4 });
    const r = g.checkCycleRiskCap(m, 1, 1.5, 4);
    expect(r.allowed).toBe(true);
    expect(r.scaledInitialStake).toBeUndefined();
  });
  it('auto-scales when over cap', () => {
    const g = newGuard();  // balance 100, cap 20
    const m = new MartingaleController({ initialStake: 5, multiplier: 2, maxSteps: 5 });
    // Full cycle total = 5+10+20+40+80 = 155 → way over 20 cap.
    const r = g.checkCycleRiskCap(m, 5, 2, 5);
    expect(r.allowed).toBe(true);
    expect(r.scaledInitialStake).toBeLessThan(5);
    expect(r.totalRisk).toBeLessThanOrEqual(r.cap + 0.05);
  });
  it('rejects when scaled initial would fall below exchange min', () => {
    const g = new RiskGuard(CFG, {
      balance: 5,
      dailyStartingBalance: 5,
      dailyPnl: 0,
      dailyLossHit: false,
      dailyProfitHit: false,
      cooldownUntil: null,
      lastResetDate: '2026-07-08',
    });
    const m = new MartingaleController({ initialStake: 1, multiplier: 2, maxSteps: 5 });
    const r = g.checkCycleRiskCap(m, 1, 2, 5);
    expect(r.allowed).toBe(false);
  });
});

describe('RiskGuard payout', () => {
  it('rejects below minPayoutPct', () => {
    const g = newGuard();
    expect(g.checkPayout(70).allowed).toBe(false);
    expect(g.checkPayout(85).allowed).toBe(true);
  });
});
