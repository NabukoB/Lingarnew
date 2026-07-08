import type { DerivClient } from './client.js';

export interface ProposalRequest {
  symbol: string;
  contractType: string;      // CALL, PUT, CALLE, PUTE, DIGITOVER, DIGITUNDER ...
  amount: number;
  duration: number;
  durationUnit: 't' | 's' | 'm' | 'h' | 'd';
  currency: string;
  barrier?: string;
  barrier2?: string;
}

export interface Proposal {
  id: string;
  askPrice: number;
  payout: number;
  payoutPercent: number;     // payout / stake - 1, in %
  spot: number;
  displayValue: string;
}

/** Request a proposal and return the parsed offer. */
export async function requestProposal(
  client: DerivClient,
  r: ProposalRequest,
): Promise<Proposal> {
  const res = await client.send({
    proposal: 1,
    amount: r.amount,
    basis: 'stake',
    contract_type: r.contractType,
    currency: r.currency,
    duration: r.duration,
    duration_unit: r.durationUnit,
    symbol: r.symbol,
    barrier: r.barrier,
    barrier2: r.barrier2,
  });
  if (res.error) throw new Error(`proposal failed: ${res.error.message}`);
  const p = res.proposal as Record<string, unknown>;
  const payout = Number(p.payout);
  const askPrice = Number(p.ask_price);
  return {
    id: String(p.id),
    askPrice,
    payout,
    payoutPercent: ((payout - askPrice) / askPrice) * 100,
    spot: Number(p.spot),
    displayValue: String(p.display_value),
  };
}

export interface BuyResult {
  contractId: string;
  buyPrice: number;
  balanceAfter: number;
  purchaseTime: number;
  transactionId: string;
}

export async function buyContract(
  client: DerivClient,
  proposalId: string,
  maxPrice: number,
): Promise<BuyResult> {
  const res = await client.send({ buy: proposalId, price: maxPrice });
  if (res.error) throw new Error(`buy failed: ${res.error.message}`);
  const b = res.buy as Record<string, unknown>;
  return {
    contractId: String(b.contract_id),
    buyPrice: Number(b.buy_price),
    balanceAfter: Number(b.balance_after),
    purchaseTime: Number(b.purchase_time),
    transactionId: String(b.transaction_id),
  };
}

export async function sellContract(
  client: DerivClient,
  contractId: string,
  price = 0,
): Promise<{ soldFor: number; balanceAfter: number }> {
  const res = await client.send({ sell: contractId, price });
  if (res.error) throw new Error(`sell failed: ${res.error.message}`);
  const s = res.sell as Record<string, unknown>;
  return {
    soldFor: Number(s.sold_for),
    balanceAfter: Number(s.balance_after),
  };
}
