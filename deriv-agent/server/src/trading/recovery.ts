import type { ContractPick } from '../signals/regime.js';
import type { SymbolSignals } from '../signals/engine.js';
import { selectContractType } from '../signals/regime.js';

export interface RecoveryCandidate {
  symbol: string;
  pick: ContractPick;
}

export interface RecoveryOptions {
  currentSymbol: string;
  previousSymbolsUsed: string[];
  minSignalScore: number;
  maxSwitchesPerCycle: number;
  switchesSoFar: number;
  preference: 'highest_score' | 'same_symbol' | 'disabled';
  topN?: number;
}

/**
 * Rank alternative symbols for the next Martingale step after a loss.
 * Excludes the current symbol and anything already used in this cycle.
 */
export function rankRecoveryCandidates(
  allSignals: SymbolSignals[],
  opts: RecoveryOptions,
): RecoveryCandidate[] {
  if (opts.preference === 'disabled' || opts.preference === 'same_symbol') return [];
  if (opts.switchesSoFar >= opts.maxSwitchesPerCycle) return [];
  const excluded = new Set([opts.currentSymbol, ...opts.previousSymbolsUsed]);
  const ranked: RecoveryCandidate[] = [];
  for (const sig of allSignals) {
    if (excluded.has(sig.symbol)) continue;
    if (!sig.ready) continue;
    const pick = selectContractType(sig);
    if (!pick) continue;
    if (pick.compositeScore < opts.minSignalScore) continue;
    ranked.push({ symbol: sig.symbol, pick });
  }
  ranked.sort((a, b) => b.pick.compositeScore - a.pick.compositeScore);
  return ranked.slice(0, opts.topN ?? 5);
}

/**
 * Decide whether to switch markets for the next step. Returns the chosen
 * candidate or null (fall back to original symbol).
 */
export function chooseRecoveryMarket(
  candidates: RecoveryCandidate[],
  originalPickScore: number,
): RecoveryCandidate | null {
  if (candidates.length === 0) return null;
  const best = candidates[0]!;
  // Require a meaningful edge to justify switching.
  if (best.pick.compositeScore <= originalPickScore + 3) return null;
  return best;
}
