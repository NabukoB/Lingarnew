import type { DerivClient } from './client.js';
import type { Candle, DerivResponse, Granularity, Tick } from './types.js';

/** Fixed-capacity ring buffer of the most recent N candles. */
export class CandleBuffer {
  private buf: Candle[] = [];
  constructor(private readonly capacity: number) {}
  push(c: Candle) {
    // Replace the last candle if the epoch matches (updating current bar);
    // otherwise append. Trim front if oversize.
    const last = this.buf[this.buf.length - 1];
    if (last && last.epoch === c.epoch) {
      this.buf[this.buf.length - 1] = c;
    } else {
      this.buf.push(c);
    }
    if (this.buf.length > this.capacity) this.buf.shift();
  }
  toArray(): Candle[] {
    return this.buf.slice();
  }
  size() {
    return this.buf.length;
  }
  last(): Candle | undefined {
    return this.buf[this.buf.length - 1];
  }
}

/** Seed a candle buffer with historical bars via ticks_history. */
export async function seedCandles(
  client: DerivClient,
  symbol: string,
  granularity: Granularity,
  count = 100,
): Promise<Candle[]> {
  const res = await client.send({
    ticks_history: symbol,
    style: 'candles',
    granularity,
    count,
    end: 'latest',
  });
  if (res.error) throw new Error(`ticks_history failed: ${res.error.message}`);
  const raw = (res.candles as Array<Record<string, unknown>>) ?? [];
  return raw.map((c) => ({
    symbol,
    granularity,
    open: Number(c.open),
    high: Number(c.high),
    low: Number(c.low),
    close: Number(c.close),
    epoch: Number(c.epoch),
  }));
}

export async function subscribeCandles(
  client: DerivClient,
  symbol: string,
  granularity: Granularity,
  onCandle: (c: Candle) => void,
): Promise<() => Promise<void>> {
  return client.subscribe(
    {
      ticks_history: symbol,
      style: 'candles',
      granularity,
      end: 'latest',
      count: 1,
    },
    (msg: DerivResponse) => {
      const ohlc = msg.ohlc as Record<string, unknown> | undefined;
      if (!ohlc) return;
      onCandle({
        symbol,
        granularity,
        open: Number(ohlc.open),
        high: Number(ohlc.high),
        low: Number(ohlc.low),
        close: Number(ohlc.close),
        epoch: Number(ohlc.epoch ?? ohlc.open_time),
      });
    },
  );
}

export async function subscribeTicks(
  client: DerivClient,
  symbol: string,
  onTick: (t: Tick) => void,
): Promise<() => Promise<void>> {
  return client.subscribe({ ticks: symbol }, (msg: DerivResponse) => {
    const tick = msg.tick as Record<string, unknown> | undefined;
    if (!tick) return;
    const quote = Number(tick.quote);
    const bid = Number(tick.bid ?? quote);
    const ask = Number(tick.ask ?? quote);
    onTick({ symbol, bid, ask, quote, epoch: Number(tick.epoch) });
  });
}
