import type { DerivClient } from './client.js';

export interface ContractStatus {
  contractId: string;
  isSold: boolean;
  isSettled: boolean;
  status: 'open' | 'won' | 'lost' | 'sold' | 'cancelled';
  profit?: number;
  payout?: number;
  sellPrice?: number;
  buyPrice: number;
  entrySpot?: number;
  exitTick?: number;
}

/** Poll a single contract until it settles. */
export async function proposalOpenContract(
  client: DerivClient,
  contractId: string,
): Promise<ContractStatus> {
  const res = await client.send({
    proposal_open_contract: 1,
    contract_id: contractId,
  });
  if (res.error) throw new Error(`proposal_open_contract failed: ${res.error.message}`);
  const c = res.proposal_open_contract as Record<string, unknown>;
  const isSold = Number(c.is_sold) === 1;
  const status = String(c.status ?? (isSold ? 'sold' : 'open')) as ContractStatus['status'];
  return {
    contractId,
    isSold,
    isSettled: isSold,
    status,
    profit: c.profit === undefined ? undefined : Number(c.profit),
    payout: c.payout === undefined ? undefined : Number(c.payout),
    sellPrice: c.sell_price === undefined ? undefined : Number(c.sell_price),
    buyPrice: Number(c.buy_price),
    entrySpot: c.entry_spot === undefined ? undefined : Number(c.entry_spot),
    exitTick: c.exit_tick === undefined ? undefined : Number(c.exit_tick),
  };
}
