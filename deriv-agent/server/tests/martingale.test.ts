import { describe, expect, it } from 'vitest';
import { MartingaleController } from '../src/trading/martingale.js';

describe('MartingaleController', () => {
  it('advances stake by multiplier on loss', () => {
    const m = new MartingaleController({ initialStake: 1, multiplier: 1.5, maxSteps: 4 });
    m.beginCycle();
    expect(m.state().step).toBe(1);
    expect(m.state().currentStake).toBe(1);

    const r1 = m.recordTrade('loss', 1, 85);
    expect(r1.cycleEnded).toBe(false);
    expect(r1.next.step).toBe(2);
    expect(r1.next.currentStake).toBeCloseTo(1.5);

    const r2 = m.recordTrade('loss', 1.5, 85);
    expect(r2.next.step).toBe(3);
    expect(r2.next.currentStake).toBeCloseTo(2.25);
  });

  it('ends cycle on win with cycle_won summary', () => {
    const m = new MartingaleController({ initialStake: 1, multiplier: 1.5, maxSteps: 4 });
    m.beginCycle();
    m.recordTrade('loss', 1, 85);
    const r = m.recordTrade('win', 1.5, 85);
    expect(r.cycleEnded).toBe(true);
    expect(r.outcomeSummary).toBe('cycle_won');
    expect(r.next.status).toBe('won');
  });

  it('fails cycle when max steps hit', () => {
    const m = new MartingaleController({ initialStake: 1, multiplier: 1.5, maxSteps: 3 });
    m.beginCycle();
    m.recordTrade('loss', 1, 85);
    m.recordTrade('loss', 1.5, 85);
    const r = m.recordTrade('loss', 2.25, 85);
    expect(r.cycleEnded).toBe(true);
    expect(r.outcomeSummary).toBe('cycle_failed');
  });

  it('totalRiskForFullCycle sums the geometric series', () => {
    const m = new MartingaleController({ initialStake: 1, multiplier: 2, maxSteps: 4 });
    // 1 + 2 + 4 + 8 = 15
    expect(m.totalRiskForFullCycle()).toBeCloseTo(15);
  });

  it('breakEvenPayoutPct climbs as cycle deepens', () => {
    const m = new MartingaleController({ initialStake: 1, multiplier: 2, maxSteps: 5 });
    m.beginCycle();
    expect(m.breakEvenPayoutPct()).toBe(0);
    m.recordTrade('loss', 1, 85);
    // After step 1 loss, step-2 stake is 2, cum loss is 1, break-even = 50%.
    expect(m.breakEvenPayoutPct()).toBeCloseTo(50);
    m.recordTrade('loss', 2, 85);
    // Cum loss 3, stake 4, break-even = 75%.
    expect(m.breakEvenPayoutPct()).toBeCloseTo(75);
  });

  it('restore rehydrates in-progress state', () => {
    const m = new MartingaleController({ initialStake: 1, multiplier: 1.5, maxSteps: 4 });
    m.restore({
      step: 3,
      currentStake: 2.25,
      totalStaked: 2.5,
      totalPnl: -2.5,
      status: 'active',
    });
    expect(m.state().step).toBe(3);
    const r = m.recordTrade('win', 2.25, 85);
    expect(r.outcomeSummary).toBe('cycle_won');
  });
});
