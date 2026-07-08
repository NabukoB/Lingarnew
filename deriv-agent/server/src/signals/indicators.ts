import type { Candle } from '../deriv/types.js';

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) sum += values[i]!;
  return sum / period;
}

/** Full EMA series (undefined for indices with insufficient history). */
export function emaSeries(values: number[], period: number): (number | undefined)[] {
  const out: (number | undefined)[] = new Array(values.length).fill(undefined);
  if (values.length < period) return out;
  const mult = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i]!;
  out[period - 1] = sum / period;
  for (let i = period; i < values.length; i++) {
    out[i] = values[i]! * mult + (out[i - 1] as number) * (1 - mult);
  }
  return out;
}

export function ema(values: number[], period: number): number | null {
  const s = emaSeries(values, period);
  const last = s[s.length - 1];
  return last === undefined ? null : last;
}

/** RSI using Wilder's smoothing. */
export function rsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i]! - values[i - 1]!;
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i]! - values[i - 1]!;
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export interface MacdOut {
  macd: number;
  signal: number;
  histogram: number;
}

export function macd(
  values: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MacdOut | null {
  if (values.length < slowPeriod + signalPeriod) return null;
  const fast = emaSeries(values, fastPeriod);
  const slow = emaSeries(values, slowPeriod);
  const macdLine: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const f = fast[i];
    const s = slow[i];
    if (f !== undefined && s !== undefined) macdLine.push(f - s);
  }
  const signalLine = emaSeries(macdLine, signalPeriod);
  const macdNow = macdLine[macdLine.length - 1];
  const signalNow = signalLine[signalLine.length - 1];
  if (macdNow === undefined || signalNow === undefined) return null;
  return { macd: macdNow, signal: signalNow, histogram: macdNow - signalNow };
}

export interface BollOut {
  mid: number;
  upper: number;
  lower: number;
  width: number;      // (upper - lower) / mid, unitless
  positionPct: number; // 0 at lower band, 100 at upper
}

export function bollinger(values: number[], period = 20, k = 2): BollOut | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  const mid = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((acc, v) => acc + (v - mid) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  const upper = mid + k * std;
  const lower = mid - k * std;
  const price = values[values.length - 1]!;
  const positionPct = upper === lower ? 50 : ((price - lower) / (upper - lower)) * 100;
  return { mid, upper, lower, width: (upper - lower) / mid, positionPct };
}

/** ATR with Wilder's smoothing over `period` bars. */
export function atr(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i]!;
    const prev = candles[i - 1]!;
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prev.close),
      Math.abs(c.low - prev.close),
    );
    trs.push(tr);
  }
  let sum = 0;
  for (let i = 0; i < period; i++) sum += trs[i]!;
  let a = sum / period;
  for (let i = period; i < trs.length; i++) {
    a = (a * (period - 1) + trs[i]!) / period;
  }
  return a;
}

export function closes(candles: Candle[]): number[] {
  return candles.map((c) => c.close);
}
