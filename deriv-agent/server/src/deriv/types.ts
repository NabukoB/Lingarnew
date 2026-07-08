export type Granularity = 60 | 300; // seconds — 1m / 5m

export interface Tick {
  symbol: string;
  bid: number;
  ask: number;
  quote: number;
  epoch: number;
}

export interface Candle {
  symbol: string;
  granularity: Granularity;
  open: number;
  high: number;
  low: number;
  close: number;
  epoch: number;
}

export interface ActiveSymbol {
  symbol: string;
  display_name: string;
  market: string;
  submarket: string;
  exchange_is_open: 0 | 1;
  pip: number;
}

export interface BalanceUpdate {
  balance: number;
  currency: string;
  loginid: string;
}

export interface DerivRequest {
  [key: string]: unknown;
  req_id?: number;
}

export interface DerivResponse {
  msg_type: string;
  req_id?: number;
  error?: { code: string; message: string };
  subscription?: { id: string };
  [key: string]: unknown;
}
