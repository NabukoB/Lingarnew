export interface AccountTier {
  tier: 100 | 250 | 500 | 1000;
  initialStake: number;
  maxSteps: number;
  suggestedMultiplier: number;
}

export const TIERS: Record<100 | 250 | 500 | 1000, AccountTier> = {
  100: { tier: 100, initialStake: 0.25, maxSteps: 4, suggestedMultiplier: 1.5 },
  250: { tier: 250, initialStake: 0.6, maxSteps: 4, suggestedMultiplier: 1.5 },
  500: { tier: 500, initialStake: 1.0, maxSteps: 5, suggestedMultiplier: 1.5 },
  1000: { tier: 1000, initialStake: 2.0, maxSteps: 5, suggestedMultiplier: 1.5 },
};

export function tierFor(balance: number): AccountTier {
  if (balance >= 1000) return TIERS[1000];
  if (balance >= 500) return TIERS[500];
  if (balance >= 250) return TIERS[250];
  return TIERS[100];
}
