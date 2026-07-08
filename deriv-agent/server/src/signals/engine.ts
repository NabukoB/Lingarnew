import type { Candle } from '../deriv/types.js';
import { atr, bollinger, closes, ema, emaSeries, macd, rsi } from './indicators.js';
import { detectPattern, patternDirection } from './patterns.js';

export type ContractType = 'rise_fall' | 'higher_lower' | 'digits';

export type Direction = 'buy' | 'sell' | 'neutral';

export interface SignalBreakdown {
  compositeScore: number;      // 0-100
  direction: Direction;        // buy at >buyThreshold, sell at <sellThreshold
  rsiScore: -1 | 0 | 1;
  macdScore: -1 | 0 | 1;
  bbScore: -1 | 0 | 1;
  emaScore: -1 | 0 | 1;
  atrWeight: number;           // 1.0 normal, higher for V75/V100 under high vol
  patternBonus: number;        // signed
}

export interface SymbolSignals {
  symbol: string;
  ready: boolean;              // true only once >= 50 candles seeded
  rise_fall: SignalBreakdown | null;
  higher_lower: SignalBreakdown | null;
  digits: SignalBreakdown | null;
}

interface ScoreOpts {
  buyThreshold: number;
  sellThreshold: number;
}

const WEIGHTS = {
  rsi: 2,
  macd: 2,
  bb: 1.5,
  ema: 1.5,
  pattern: 1,
} as const;

const WEIGHT_SUM = WEIGHTS.rsi + WEIGHTS.macd + WEIGHTS.bb + WEIGHTS.ema + WEIGHTS.pattern;

/**
 * Compute per-contract-type signals for one symbol. Returns null slots when
 * a contract type isn't a natural fit for the current regime, so the
 * contract-type selector can just take the max.
 */
export function computeSignals(
  symbol: string,
  candles1m: Candle[],
  opts: ScoreOpts = { buyThreshold: 70, sellThreshold: 30 },
): SymbolSignals {
  if (candles1m.length < 50) {
    return { symbol, ready: false, rise_fall: null, higher_lower: null, digits: null };
  }
  const cl = closes(candles1m);
  const rsiVal = rsi(cl, 14);
  const macdVal = macd(cl, 12, 26, 9);
  const bbVal = bollinger(cl, 20, 2);
  const emaFast = ema(cl, 9);
  const emaSlow = ema(cl, 21);
  const emaFastSeries = emaSeries(cl, 9);
  const emaSlowSeries = emaSeries(cl, 21);
  const atrVal = atr(candles1m, 14);
  const pattern = detectPattern(candles1m.slice(-3));

  if (rsiVal === null || macdVal === null || bbVal === null || emaFast === null || emaSlow === null) {
    return { symbol, ready: false, rise_fall: null, higher_lower: null, digits: null };
  }

  const rsiScore: -1 | 0 | 1 = rsiVal < 30 ? 1 : rsiVal > 70 ? -1 : 0;
  const macdScore: -1 | 0 | 1 = macdVal.histogram > 0 && macdVal.macd > macdVal.signal
    ? 1
    : macdVal.histogram < 0 && macdVal.macd < macdVal.signal
      ? -1
      : 0;
  const bbScore: -1 | 0 | 1 = bbVal.positionPct < 15 ? 1 : bbVal.positionPct > 85 ? -1 : 0;

  // EMA crossover from previous bar for freshness.
  const prevFast = emaFastSeries[emaFastSeries.length - 2];
  const prevSlow = emaSlowSeries[emaSlowSeries.length - 2];
  let emaScore: -1 | 0 | 1 = 0;
  if (prevFast !== undefined && prevSlow !== undefined) {
    if (prevFast <= prevSlow && emaFast > emaSlow) emaScore = 1;
    else if (prevFast >= prevSlow && emaFast < emaSlow) emaScore = -1;
    else emaScore = emaFast > emaSlow ? 1 : emaFast < emaSlow ? -1 : 0;
  }

  const patDir = patternDirection(pattern);
  const patternBonus = patDir === 'buy' ? 5 : patDir === 'sell' ? -5 : 0;

  // ATR weight: high vol on V75/V100 gets +20%, low vol gets -20%.
  const atrWeight = atrVal === null
    ? 1
    : atrWeightForSymbol(symbol, atrVal, cl[cl.length - 1]!);

  const riseFall = scoreBreakdown(
    { rsiScore, macdScore, bbScore, emaScore, patternBonus, atrWeight },
    opts,
    { emaAlignment: emaScore, macdAlignment: macdScore },
  );

  // Higher/Lower — ranging market bias; BB position and RSI near midline matter more.
  const rangingSignal = deriveRanging(bbVal, rsiVal, macdVal);
  const higherLower = rangingSignal !== null
    ? scoreBreakdown(
        { rsiScore, macdScore, bbScore: rangingSignal, emaScore, patternBonus, atrWeight },
        opts,
        { emaAlignment: emaScore, macdAlignment: macdScore, dampen: true },
      )
    : null;

  // Digits — low-volatility bias, no strong direction preference.
  const digits = deriveDigits(atrWeight, rsiScore, macdScore, opts, patternBonus);

  return {
    symbol,
    ready: true,
    rise_fall: riseFall,
    higher_lower: higherLower,
    digits,
  };
}

interface RawInputs {
  rsiScore: -1 | 0 | 1;
  macdScore: -1 | 0 | 1;
  bbScore: -1 | 0 | 1;
  emaScore: -1 | 0 | 1;
  patternBonus: number;
  atrWeight: number;
}

function scoreBreakdown(
  raw: RawInputs,
  opts: ScoreOpts,
  extras: { emaAlignment: number; macdAlignment: number; dampen?: boolean },
): SignalBreakdown {
  const weightedVote =
    raw.rsiScore * WEIGHTS.rsi +
    raw.macdScore * WEIGHTS.macd +
    raw.bbScore * WEIGHTS.bb +
    raw.emaScore * WEIGHTS.ema;
  // Max weighted vote span is +/- WEIGHT_SUM (roughly); normalise around 50.
  const normalised = 50 + (weightedVote / (WEIGHT_SUM - WEIGHTS.pattern)) * 40;
  const bonused = normalised + raw.patternBonus;
  let composite = Math.max(0, Math.min(100, bonused));
  if (extras.dampen) composite = 50 + (composite - 50) * 0.7;
  // ATR weight amplifies distance from 50 (never flips direction).
  composite = 50 + (composite - 50) * raw.atrWeight;
  composite = Math.max(0, Math.min(100, composite));
  const direction: Direction =
    composite >= opts.buyThreshold ? 'buy' : composite <= opts.sellThreshold ? 'sell' : 'neutral';
  return {
    compositeScore: Math.round(composite),
    direction,
    rsiScore: raw.rsiScore,
    macdScore: raw.macdScore,
    bbScore: raw.bbScore,
    emaScore: raw.emaScore,
    atrWeight: raw.atrWeight,
    patternBonus: raw.patternBonus,
  };
}

function deriveRanging(
  bb: { positionPct: number; width: number },
  rsiVal: number,
  macdVal: { histogram: number },
): -1 | 0 | 1 | null {
  const squeezed = bb.width < 0.02;
  const midRsi = rsiVal > 40 && rsiVal < 60;
  const weakMomentum = Math.abs(macdVal.histogram) < 0.5;
  if (!squeezed && !(midRsi && weakMomentum)) return null;
  // In a squeeze near the lower band, favour higher; near upper, favour lower.
  return bb.positionPct < 40 ? 1 : bb.positionPct > 60 ? -1 : 0;
}

function deriveDigits(
  atrWeight: number,
  rsiScore: -1 | 0 | 1,
  macdScore: -1 | 0 | 1,
  opts: ScoreOpts,
  patternBonus: number,
): SignalBreakdown | null {
  // Digits contracts fit low-volatility, choppy regimes.
  if (atrWeight >= 1) return null;
  const composite = Math.round(50 + (1 - atrWeight) * 100 * 0.5); // higher score as vol drops
  const direction: Direction =
    composite >= opts.buyThreshold ? 'buy' : composite <= opts.sellThreshold ? 'sell' : 'neutral';
  return {
    compositeScore: Math.max(0, Math.min(100, composite)),
    direction,
    rsiScore,
    macdScore,
    bbScore: 0,
    emaScore: 0,
    atrWeight,
    patternBonus,
  };
}

function atrWeightForSymbol(symbol: string, atrVal: number, price: number): number {
  const atrPct = (atrVal / price) * 100;
  // High-vol indices amplify signal; low-vol dampen. Heuristic bounds
  // chosen so V10 sits ~0.9, V75/V100 sit ~1.2 in typical conditions.
  const isHigh = /V(75|100)/.test(symbol);
  const isLow = /V10(?!0)|V25/.test(symbol);
  if (isHigh) return Math.min(1.35, 1 + atrPct * 0.15);
  if (isLow) return Math.max(0.75, 1 - atrPct * 0.1);
  return 1;
}
