import { describe, expect, it } from 'vitest';
import { rankRecoveryCandidates, chooseRecoveryMarket } from '../src/trading/recovery.js';
import type { SymbolSignals } from '../src/signals/engine.js';

function sig(symbol: string, score: number): SymbolSignals {
  return {
    symbol,
    ready: true,
    rise_fall: {
      compositeScore: score,
      direction: score >= 70 ? 'buy' : score <= 30 ? 'sell' : 'neutral',
      rsiScore: 0,
      macdScore: 0,
      bbScore: 0,
      emaScore: 0,
      atrWeight: 1,
      patternBonus: 0,
    },
    higher_lower: null,
    digits: null,
  };
}

describe('rankRecoveryCandidates', () => {
  it('excludes current symbol', () => {
    const all = [sig('V100', 85), sig('V75', 80), sig('V50', 75)];
    const out = rankRecoveryCandidates(all, {
      currentSymbol: 'V100',
      previousSymbolsUsed: ['V100'],
      minSignalScore: 60,
      maxSwitchesPerCycle: 3,
      switchesSoFar: 0,
      preference: 'highest_score',
    });
    expect(out.map((c) => c.symbol)).toEqual(['V75', 'V50']);
  });
  it('respects switch cap', () => {
    const all = [sig('V100', 85), sig('V75', 80)];
    const out = rankRecoveryCandidates(all, {
      currentSymbol: 'V100',
      previousSymbolsUsed: ['V100'],
      minSignalScore: 60,
      maxSwitchesPerCycle: 2,
      switchesSoFar: 2,
      preference: 'highest_score',
    });
    expect(out).toHaveLength(0);
  });
  it('filters below min score', () => {
    const all = [sig('V100', 85), sig('V75', 55), sig('V50', 40)];
    const out = rankRecoveryCandidates(all, {
      currentSymbol: 'V100',
      previousSymbolsUsed: ['V100'],
      minSignalScore: 60,
      maxSwitchesPerCycle: 3,
      switchesSoFar: 0,
      preference: 'highest_score',
    });
    expect(out).toHaveLength(0);
  });
  it('returns empty when disabled', () => {
    const all = [sig('V100', 85), sig('V75', 80)];
    const out = rankRecoveryCandidates(all, {
      currentSymbol: 'V100',
      previousSymbolsUsed: ['V100'],
      minSignalScore: 60,
      maxSwitchesPerCycle: 3,
      switchesSoFar: 0,
      preference: 'disabled',
    });
    expect(out).toHaveLength(0);
  });
});

describe('chooseRecoveryMarket', () => {
  it('needs meaningful edge to switch', () => {
    const c = [{ symbol: 'V75', pick: { contractType: 'rise_fall' as const, compositeScore: 72, direction: 'buy' as const, reason: '' } }];
    expect(chooseRecoveryMarket(c, 70)).toBeNull();
  });
  it('switches when edge is clear', () => {
    const c = [{ symbol: 'V75', pick: { contractType: 'rise_fall' as const, compositeScore: 85, direction: 'buy' as const, reason: '' } }];
    expect(chooseRecoveryMarket(c, 70)?.symbol).toBe('V75');
  });
});
