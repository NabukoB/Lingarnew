import type { DerivClient } from '../deriv/client.js';
import { proposalOpenContract, type ContractStatus } from '../deriv/portfolio.js';

export interface Settled {
  contractId: string;
  outcome: 'win' | 'loss';
  profit: number;
  payout: number;
  entrySpot?: number;
  exitTick?: number;
}

/**
 * Polls `proposal_open_contract` for a list of open contracts and calls
 * `onSettled` when each one clears. Stops polling for a contract once
 * resolved. Poll interval is 2s by default.
 */
export class SettlementMonitor {
  private watched = new Map<string, (s: Settled) => void>();
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly client: DerivClient,
    private readonly onError: (err: Error) => void,
    private readonly pollMs = 2000,
  ) {}

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.pollMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  watch(contractId: string, onSettled: (s: Settled) => void) {
    this.watched.set(contractId, onSettled);
    this.start();
  }

  unwatch(contractId: string) {
    this.watched.delete(contractId);
    if (this.watched.size === 0) this.stop();
  }

  private async tick() {
    if (this.watched.size === 0) return;
    const ids = [...this.watched.keys()];
    for (const id of ids) {
      try {
        const s = await proposalOpenContract(this.client, id);
        if (!s.isSettled) continue;
        const cb = this.watched.get(id);
        if (!cb) continue;
        this.watched.delete(id);
        cb(toSettled(id, s));
      } catch (err) {
        this.onError(err as Error);
      }
    }
    if (this.watched.size === 0) this.stop();
  }
}

function toSettled(contractId: string, s: ContractStatus): Settled {
  const outcome: 'win' | 'loss' =
    s.status === 'won' || (s.profit ?? 0) > 0 ? 'win' : 'loss';
  return {
    contractId,
    outcome,
    profit: s.profit ?? (outcome === 'win' ? (s.payout ?? 0) - s.buyPrice : -s.buyPrice),
    payout: s.payout ?? 0,
    entrySpot: s.entrySpot,
    exitTick: s.exitTick,
  };
}
