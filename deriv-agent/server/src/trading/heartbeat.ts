import type { DerivClient } from '../deriv/client.js';
import { fetchBalance } from '../deriv/balance.js';
import type { RiskGuard } from './risk-guard.js';

export interface HeartbeatHooks {
  onBalance?: (balance: number, currency: string) => void;
  onDailyReset?: (todayUtc: string, startingBalance: number) => void;
  onCooldownExpired?: () => void;
  onError?: (err: Error) => void;
}

/**
 * 30s tick: syncs balance from Deriv, checks for date rollover (0000 UTC)
 * to reset daily limits, and expires cooldowns whose timers have elapsed.
 */
export class Heartbeat {
  private timer: NodeJS.Timeout | null = null;
  constructor(
    private readonly client: DerivClient,
    private readonly risk: RiskGuard,
    private readonly hooks: HeartbeatHooks = {},
    private readonly intervalMs = 30_000,
  ) {}

  start() {
    if (this.timer) return;
    this.tick(); // fire once immediately
    this.timer = setInterval(() => this.tick(), this.intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick() {
    try {
      // Balance sync
      if (this.client.isConnected()) {
        const b = await fetchBalance(this.client);
        this.risk.setBalance(b.balance);
        this.hooks.onBalance?.(b.balance, b.currency);
      }
      // Daily reset
      const today = todayUtc();
      if (today !== this.risk.state().lastResetDate) {
        this.risk.resetDailyLimits(this.risk.state().balance, today);
        this.hooks.onDailyReset?.(today, this.risk.state().balance);
      }
      // Cooldown expiry
      if (this.risk.state().cooldownUntil && !this.risk.isCoolingDown()) {
        this.risk.endCooldown();
        this.hooks.onCooldownExpired?.();
      }
    } catch (err) {
      this.hooks.onError?.(err as Error);
    }
  }
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
