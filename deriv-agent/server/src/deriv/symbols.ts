import type { DerivClient } from './client.js';
import type { ActiveSymbol } from './types.js';

/**
 * Discover tradeable Volatility Index symbols. Returns only those currently
 * open for trading.
 */
export async function discoverVolatilitySymbols(client: DerivClient): Promise<ActiveSymbol[]> {
  const res = await client.send({
    active_symbols: 'brief',
    product_type: 'basic',
  });
  if (res.error) throw new Error(`active_symbols failed: ${res.error.message}`);
  const all = (res.active_symbols as ActiveSymbol[]) ?? [];
  return all.filter(
    (s) => s.market === 'synthetic_index' && s.submarket.includes('random') && s.exchange_is_open === 1,
  );
}
