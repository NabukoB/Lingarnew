#!/usr/bin/env node
// CLI wrapper around Alpaca's REST API. No dependencies beyond Node's built-in fetch/fs.
// Usage: node tradingAgent/scripts/alpaca.mjs <subcommand> [positional args] [--flag=value ...]

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PAUSED_FILE = path.join(SCRIPT_DIR, "..", "memory", "PAUSED");

const TRADING_BASE_URL = process.env.ALPACA_BASE_URL || "https://paper-api.alpaca.markets";
const DATA_BASE_URL = process.env.ALPACA_DATA_URL || "https://data.alpaca.markets";
const IS_PAPER = TRADING_BASE_URL.includes("paper-api.alpaca.markets");
const LIVE_CONFIRMED = process.env.LIVE_TRADING_CONFIRMED === "true";

const MAX_POSITION_PCT = Number(process.env.MAX_POSITION_PCT || "10");
const MAX_OPEN_POSITIONS = Number(process.env.MAX_OPEN_POSITIONS || "5");
const MAX_DAILY_LOSS_PCT = Number(process.env.MAX_DAILY_LOSS_PCT || "3");

class RailError extends Error {
  constructor(message) {
    super(message);
    this.railViolation = message;
  }
}

function authHeaders() {
  const keyId = process.env.ALPACA_API_KEY;
  const secret = process.env.ALPACA_SECRET_KEY;
  if (!keyId || !secret) {
    throw new Error("ALPACA_API_KEY / ALPACA_SECRET_KEY are not set");
  }
  return { "APCA-API-KEY-ID": keyId, "APCA-API-SECRET-KEY": secret };
}

async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      ...authHeaders(),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${method} ${url} -> ${res.status}: ${text}`);
  }
  return json;
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (const arg of argv) {
    if (arg.startsWith("--")) {
      const [key, ...rest] = arg.slice(2).split("=");
      flags[key] = rest.length ? rest.join("=") : "true";
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function assertNotPaused() {
  if (existsSync(PAUSED_FILE)) {
    throw new RailError(`paused: remove ${PAUSED_FILE} to resume trading`);
  }
}

function assertPaperOrConfirmed() {
  if (!IS_PAPER && !LIVE_CONFIRMED) {
    throw new RailError(
      `refusing to trade against a non-paper ALPACA_BASE_URL (${TRADING_BASE_URL}) without LIVE_TRADING_CONFIRMED=true`
    );
  }
}

function warnIfLive() {
  if (!IS_PAPER) {
    process.stderr.write(`LIVE MODE WARNING: ALPACA_BASE_URL is not the paper endpoint (${TRADING_BASE_URL})\n`);
  }
}

async function getAccount() {
  return request("GET", `${TRADING_BASE_URL}/v2/account`);
}

async function getPositions() {
  return request("GET", `${TRADING_BASE_URL}/v2/positions`);
}

async function estimateNotional(symbol, qty, type, limitPrice) {
  if (type === "limit" && limitPrice) return qty * Number(limitPrice);
  const quote = await request("GET", `${DATA_BASE_URL}/v2/stocks/${symbol}/quotes/latest`);
  const askPrice = quote?.quote?.ap || quote?.quote?.bp;
  if (!askPrice) throw new Error(`could not get a quote for ${symbol} to size the order`);
  return qty * askPrice;
}

async function assertPositionSizeOk(symbol, qty, type, limitPrice) {
  const account = await getAccount();
  const equity = Number(account.equity);
  const notional = await estimateNotional(symbol, qty, type, limitPrice);
  const pct = (notional / equity) * 100;
  if (pct > MAX_POSITION_PCT) {
    throw new RailError(
      `order notional ~$${notional.toFixed(2)} is ${pct.toFixed(1)}% of equity, exceeds MAX_POSITION_PCT=${MAX_POSITION_PCT}%`
    );
  }
}

async function assertOpenPositionCapOk(symbol) {
  const positions = await getPositions();
  const alreadyHeld = positions.some((p) => p.symbol === symbol);
  if (!alreadyHeld && positions.length >= MAX_OPEN_POSITIONS) {
    throw new RailError(
      `already holding ${positions.length} positions, at MAX_OPEN_POSITIONS=${MAX_OPEN_POSITIONS}`
    );
  }
}

async function assertDailyLossOk() {
  const account = await getAccount();
  const equity = Number(account.equity);
  const lastEquity = Number(account.last_equity);
  if (!lastEquity) return; // no prior close to compare against (e.g. brand-new account)
  const pnlPct = ((equity - lastEquity) / lastEquity) * 100;
  if (pnlPct <= -MAX_DAILY_LOSS_PCT) {
    throw new RailError(
      `daily P/L ${pnlPct.toFixed(2)}% breaches MAX_DAILY_LOSS_PCT=-${MAX_DAILY_LOSS_PCT}%, no new buys today`
    );
  }
}

const commands = {
  async account() {
    return getAccount();
  },

  async clock() {
    return request("GET", `${TRADING_BASE_URL}/v2/clock`);
  },

  async positions() {
    return getPositions();
  },

  async position({ positional }) {
    const [symbol] = positional;
    if (!symbol) throw new Error("usage: position <SYMBOL>");
    return request("GET", `${TRADING_BASE_URL}/v2/positions/${symbol}`);
  },

  async "close-position"({ positional, flags }) {
    assertNotPaused();
    assertPaperOrConfirmed();
    const [symbol] = positional;
    if (!symbol) throw new Error("usage: close-position <SYMBOL> [--percentage=100]");
    const qs = flags.percentage ? `?percentage=${flags.percentage}` : "";
    return request("DELETE", `${TRADING_BASE_URL}/v2/positions/${symbol}${qs}`);
  },

  async orders({ flags }) {
    const status = flags.status || "open";
    return request("GET", `${TRADING_BASE_URL}/v2/orders?status=${status}`);
  },

  async order({ positional }) {
    const [id] = positional;
    if (!id) throw new Error("usage: order <ORDER_ID>");
    return request("GET", `${TRADING_BASE_URL}/v2/orders/${id}`);
  },

  async "cancel-order"({ positional }) {
    assertNotPaused();
    assertPaperOrConfirmed();
    const [id] = positional;
    if (!id) throw new Error("usage: cancel-order <ORDER_ID>");
    return request("DELETE", `${TRADING_BASE_URL}/v2/orders/${id}`);
  },

  async "replace-order"({ positional, flags }) {
    assertNotPaused();
    assertPaperOrConfirmed();
    const [id] = positional;
    if (!id) throw new Error("usage: replace-order <ORDER_ID> [--qty=] [--stop-price=] [--limit-price=] [--trail=]");
    const body = {};
    if (flags.qty) body.qty = flags.qty;
    if (flags["stop-price"]) body.stop_price = flags["stop-price"];
    if (flags["limit-price"]) body.limit_price = flags["limit-price"];
    if (flags.trail) body.trail = flags.trail;
    return request("PATCH", `${TRADING_BASE_URL}/v2/orders/${id}`, body);
  },

  async bars({ positional, flags }) {
    const [symbol] = positional;
    if (!symbol) throw new Error("usage: bars <SYMBOL> [--timeframe=1Day] [--limit=30]");
    const timeframe = flags.timeframe || "1Day";
    const limit = flags.limit || "30";
    return request(
      "GET",
      `${DATA_BASE_URL}/v2/stocks/${symbol}/bars?timeframe=${timeframe}&limit=${limit}`
    );
  },

  async quote({ positional }) {
    const [symbol] = positional;
    if (!symbol) throw new Error("usage: quote <SYMBOL>");
    return request("GET", `${DATA_BASE_URL}/v2/stocks/${symbol}/quotes/latest`);
  },

  async "most-active"({ flags }) {
    const top = flags.top || "20";
    const by = flags.by || "volume";
    return request("GET", `${DATA_BASE_URL}/v1beta1/screener/stocks/most-actives?top=${top}&by=${by}`);
  },

  async news({ flags }) {
    const params = new URLSearchParams();
    if (flags.symbols) params.set("symbols", flags.symbols);
    params.set("limit", flags.limit || "10");
    return request("GET", `${DATA_BASE_URL}/v1beta1/news?${params.toString()}`);
  },

  async buy({ positional, flags }) {
    assertNotPaused();
    assertPaperOrConfirmed();
    const [symbol] = positional;
    const { qty, type = "market", "limit-price": limitPrice, "stop-loss": stopLoss, "take-profit": takeProfit } = flags;
    if (!symbol || !qty) throw new Error("usage: buy <SYMBOL> --qty=N --type=market|limit [--limit-price=] --stop-loss=PRICE [--take-profit=PRICE]");
    if (!stopLoss) throw new Error("--stop-loss is required for every buy: no unprotected positions");
    if (type === "limit" && !limitPrice) throw new Error("--limit-price is required when --type=limit");

    await assertPositionSizeOk(symbol, Number(qty), type, limitPrice);
    await assertOpenPositionCapOk(symbol);
    await assertDailyLossOk();

    const body = {
      symbol,
      qty: String(qty),
      side: "buy",
      type,
      time_in_force: "day",
      order_class: "bracket",
      stop_loss: { stop_price: String(stopLoss) },
    };
    if (type === "limit") body.limit_price = String(limitPrice);
    if (takeProfit) body.take_profit = { limit_price: String(takeProfit) };

    return request("POST", `${TRADING_BASE_URL}/v2/orders`, body);
  },

  async sell({ positional, flags }) {
    assertNotPaused();
    assertPaperOrConfirmed();
    const [symbol] = positional;
    const { qty, type = "market", "limit-price": limitPrice } = flags;
    if (!symbol || !qty) throw new Error("usage: sell <SYMBOL> --qty=N [--type=market|limit] [--limit-price=]");
    if (type === "limit" && !limitPrice) throw new Error("--limit-price is required when --type=limit");

    const body = { symbol, qty: String(qty), side: "sell", type, time_in_force: "day" };
    if (type === "limit") body.limit_price = String(limitPrice);

    return request("POST", `${TRADING_BASE_URL}/v2/orders`, body);
  },
};

async function main() {
  const [subcommand, ...rest] = process.argv.slice(2);
  if (!subcommand || !commands[subcommand]) {
    process.stderr.write(`Usage: alpaca.mjs <subcommand> [args] [--flags]\n\nSubcommands:\n  ${Object.keys(commands).join("\n  ")}\n`);
    process.exit(subcommand ? 1 : 0);
  }

  warnIfLive();
  const args = parseArgs(rest);

  try {
    const result = await commands[subcommand](args);
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } catch (err) {
    const payload = { error: err.message };
    if (err instanceof RailError) payload.rail_violation = err.railViolation;
    process.stderr.write(JSON.stringify(payload, null, 2) + "\n");
    process.exit(1);
  }
}

main();
