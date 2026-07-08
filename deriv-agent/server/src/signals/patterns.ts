import type { Candle } from '../deriv/types.js';

export type PatternKind = 'bullish_engulfing' | 'bearish_engulfing' | 'bullish_pin' | 'bearish_pin' | null;

/**
 * Look at the last three candles and return a single dominant pattern if
 * present. The engine gives +5 to a matching direction and -5 to the
 * opposite; NEUTRAL adds 0.
 */
export function detectPattern(candles: Candle[]): PatternKind {
  if (candles.length < 2) return null;
  const prev = candles[candles.length - 2]!;
  const curr = candles[candles.length - 1]!;

  const prevBody = Math.abs(prev.close - prev.open);
  const currBody = Math.abs(curr.close - curr.open);
  const currRange = curr.high - curr.low;

  // Engulfing: current body opens/closes past previous body in opposite dir.
  if (currBody > prevBody) {
    if (
      curr.close > curr.open &&
      prev.close < prev.open &&
      curr.close > prev.open &&
      curr.open < prev.close
    ) {
      return 'bullish_engulfing';
    }
    if (
      curr.close < curr.open &&
      prev.close > prev.open &&
      curr.close < prev.open &&
      curr.open > prev.close
    ) {
      return 'bearish_engulfing';
    }
  }

  // Pin bar: small body, long wick on the opposite side of intended move.
  if (currRange > 0 && currBody / currRange < 0.35) {
    const upperWick = curr.high - Math.max(curr.open, curr.close);
    const lowerWick = Math.min(curr.open, curr.close) - curr.low;
    if (lowerWick > currBody * 2 && lowerWick > upperWick * 1.5) return 'bullish_pin';
    if (upperWick > currBody * 2 && upperWick > lowerWick * 1.5) return 'bearish_pin';
  }

  return null;
}

export function patternDirection(p: PatternKind): 'buy' | 'sell' | null {
  if (p === 'bullish_engulfing' || p === 'bullish_pin') return 'buy';
  if (p === 'bearish_engulfing' || p === 'bearish_pin') return 'sell';
  return null;
}
