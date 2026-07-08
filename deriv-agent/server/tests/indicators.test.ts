import { describe, expect, it } from 'vitest';
import { atr, bollinger, ema, emaSeries, macd, rsi, sma } from '../src/signals/indicators.js';
import type { Candle } from '../src/deriv/types.js';

describe('sma', () => {
  it('averages the last N values', () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toBeCloseTo(4);
    expect(sma([10, 20, 30], 3)).toBe(20);
  });
  it('returns null when too short', () => {
    expect(sma([1, 2], 3)).toBeNull();
  });
});

describe('ema', () => {
  it('matches a hand-computed EMA(3) on a simple ramp', () => {
    // EMA multiplier = 2/(3+1) = 0.5. Seed = SMA(1,2,3) = 2.
    // t=3: 4*0.5 + 2*0.5 = 3
    // t=4: 5*0.5 + 3*0.5 = 4
    expect(ema([1, 2, 3, 4, 5], 3)).toBeCloseTo(4);
  });
  it('series length matches input', () => {
    const s = emaSeries([1, 2, 3, 4, 5], 3);
    expect(s).toHaveLength(5);
    expect(s[0]).toBeUndefined();
    expect(s[1]).toBeUndefined();
    expect(s[2]).toBeCloseTo(2);
  });
});

describe('rsi', () => {
  it('flat prices yield 100 (no losses) after warmup', () => {
    const flat = new Array(50).fill(100);
    // Wilder's RSI is 100 when no losses at all.
    expect(rsi(flat, 14)).toBe(100);
  });
  it('monotonically rising prices give high RSI', () => {
    const rising = Array.from({ length: 50 }, (_, i) => 100 + i);
    const v = rsi(rising, 14)!;
    expect(v).toBeGreaterThan(90);
  });
  it('monotonically falling prices give low RSI', () => {
    const falling = Array.from({ length: 50 }, (_, i) => 200 - i);
    const v = rsi(falling, 14)!;
    expect(v).toBeLessThan(10);
  });
});

describe('macd', () => {
  it('rising trend gives positive MACD line (fast leads slow)', () => {
    const rising = Array.from({ length: 60 }, (_, i) => 100 + i * 0.5);
    const m = macd(rising)!;
    // In a rising trend the fast EMA sits above the slow EMA → macd > 0.
    // Histogram (macd - signal) approaches 0 in steady-state, so we don't
    // assert on it here.
    expect(m.macd).toBeGreaterThan(0);
  });
  it('accelerating rise gives positive histogram', () => {
    const accel = Array.from({ length: 60 }, (_, i) => 100 + i * i * 0.05);
    const m = macd(accel)!;
    expect(m.histogram).toBeGreaterThan(0);
  });
  it('null when not enough data', () => {
    expect(macd([1, 2, 3])).toBeNull();
  });
});

describe('bollinger', () => {
  it('wraps positionPct into 0-100', () => {
    const data = Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i / 3));
    const b = bollinger(data)!;
    expect(b.positionPct).toBeGreaterThanOrEqual(0);
    expect(b.positionPct).toBeLessThanOrEqual(100);
  });
});

describe('atr', () => {
  it('is positive on realistic candles', () => {
    const candles: Candle[] = Array.from({ length: 30 }, (_, i) => ({
      symbol: 'V100',
      granularity: 60,
      open: 100 + i,
      high: 101 + i,
      low: 99 + i,
      close: 100.5 + i,
      epoch: i * 60,
    }));
    const a = atr(candles)!;
    expect(a).toBeGreaterThan(0);
  });
});
