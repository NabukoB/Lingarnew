import type { DerivClient } from './client.js';
import type { BalanceUpdate, DerivResponse } from './types.js';

export async function subscribeBalance(
  client: DerivClient,
  onBalance: (b: BalanceUpdate) => void,
): Promise<() => Promise<void>> {
  return client.subscribe({ balance: 1 }, (msg: DerivResponse) => {
    const b = msg.balance as Record<string, unknown> | undefined;
    if (!b) return;
    onBalance({
      balance: Number(b.balance),
      currency: String(b.currency),
      loginid: String(b.loginid ?? ''),
    });
  });
}

export async function fetchBalance(client: DerivClient): Promise<BalanceUpdate> {
  const res = await client.send({ balance: 1 });
  if (res.error) throw new Error(`balance failed: ${res.error.message}`);
  const b = res.balance as Record<string, unknown>;
  return {
    balance: Number(b.balance),
    currency: String(b.currency),
    loginid: String(b.loginid ?? ''),
  };
}
