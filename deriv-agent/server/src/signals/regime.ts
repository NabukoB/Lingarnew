import type { ContractType, SymbolSignals } from './engine.js';

export interface ContractPick {
  contractType: ContractType;
  compositeScore: number;
  direction: 'buy' | 'sell' | 'neutral';
  reason: string;
}

/**
 * Pick the contract type with the highest composite score for a symbol.
 * Higher/lower and digits are only considered when they beat rise/fall.
 */
export function selectContractType(sig: SymbolSignals): ContractPick | null {
  if (!sig.ready) return null;
  const options: Array<ContractPick & { raw: number }> = [];
  if (sig.rise_fall) {
    options.push({
      contractType: 'rise_fall',
      compositeScore: sig.rise_fall.compositeScore,
      direction: sig.rise_fall.direction,
      reason: 'directional trend',
      raw: sig.rise_fall.compositeScore * 1.0,
    });
  }
  if (sig.higher_lower) {
    options.push({
      contractType: 'higher_lower',
      compositeScore: sig.higher_lower.compositeScore,
      direction: sig.higher_lower.direction,
      reason: 'ranging market',
      raw: sig.higher_lower.compositeScore * 0.95, // small penalty vs. cleaner rise/fall
    });
  }
  if (sig.digits) {
    options.push({
      contractType: 'digits',
      compositeScore: sig.digits.compositeScore,
      direction: sig.digits.direction,
      reason: 'low volatility',
      raw: sig.digits.compositeScore * 0.9,
    });
  }
  if (options.length === 0) return null;
  options.sort((a, b) => b.raw - a.raw);
  const winner = options[0]!;
  return {
    contractType: winner.contractType,
    compositeScore: winner.compositeScore,
    direction: winner.direction,
    reason: winner.reason,
  };
}
