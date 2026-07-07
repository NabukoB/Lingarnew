export type AlpacaAccount = {
  account_number: string;
  status: string;
  equity: string;
  last_equity: string;
  cash: string;
  buying_power: string;
  portfolio_value: string;
  daytrade_count: number;
};

export type AlpacaPosition = {
  symbol: string;
  qty: string;
  avg_entry_price: string;
  current_price: string;
  market_value: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  side: string;
};

export type AlpacaOrder = {
  id: string;
  symbol: string;
  side: string;
  qty: string;
  type: string;
  status: string;
  submitted_at: string;
  limit_price: string | null;
  stop_price: string | null;
  trail_percent: string | null;
  time_in_force: string;
};

const endpoint = () =>
  process.env.ALPACA_ENDPOINT ?? "https://paper-api.alpaca.markets/v2";

async function alpacaFetch<T>(path: string): Promise<T | null> {
  const key = process.env.ALPACA_API_KEY;
  const secret = process.env.ALPACA_SECRET_KEY;
  if (!key || !secret) return null;
  try {
    const res = await fetch(`${endpoint()}/${path}`, {
      headers: {
        "APCA-API-KEY-ID": key,
        "APCA-API-SECRET-KEY": secret,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const getAccount = () => alpacaFetch<AlpacaAccount>("account");
export const getPositions = () => alpacaFetch<AlpacaPosition[]>("positions");
export const getOpenOrders = () =>
  alpacaFetch<AlpacaOrder[]>("orders?status=open&limit=50");
