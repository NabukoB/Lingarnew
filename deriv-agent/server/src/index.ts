import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './trpc/router.js';
import { DerivClient } from './deriv/client.js';
import { TradingEngine } from './trading/engine.js';
import { MartingaleController } from './trading/martingale.js';
import { RiskGuard } from './trading/risk-guard.js';
import { SettlementMonitor } from './trading/settlement-monitor.js';
import { Heartbeat } from './trading/heartbeat.js';
import { MarketWebSocketServer } from './ws/server.js';
import { wireEngineToWs } from './ws/broadcast.js';
import { verifyRequestAuth, signUserToken } from './auth.js';
import { tierFor } from './trading/tiers.js';
import * as db from './db/queries.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// Dev-only helper: mint a JWT for the demo user id so the frontend can
// open a WebSocket without a full auth flow yet.
app.post('/api/dev/token', (req, res) => {
  if (process.env.DEMO_MODE !== 'true') {
    res.status(403).json({ error: 'disabled outside DEMO_MODE' });
    return;
  }
  const userId = String(req.body?.userId ?? 'demo-user');
  res.json({ token: signUserToken(userId), userId });
});

app.use(
  '/api/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req }) => {
      const auth = req.headers['authorization'];
      const userId = auth?.startsWith('Bearer ') ? auth.slice(7) : 'demo-user';
      return { userId };
    },
  }),
);

const httpServer = createServer(app);
const engines = new Map<string, TradingEngine>();
const wsServer = new MarketWebSocketServer(httpServer, engines, verifyRequestAuth);

async function bootstrapEngine(userId: string): Promise<TradingEngine | null> {
  const token = process.env.DERIV_API_TOKEN;
  const appId = process.env.DERIV_APP_ID;
  if (!token || !appId) {
    console.warn('[server] DERIV_API_TOKEN/DERIV_APP_ID missing; engine will not start');
    return null;
  }
  const cfg = (await db.getConfig(userId)) ?? await db.upsertConfig(userId, {
    trading_enabled: false,
    demo_mode: true,
  });
  const tier = tierFor(cfg.account_tier);
  const client = new DerivClient({
    endpoint: process.env.DERIV_ENDPOINT ?? 'wss://ws.binaryws.com/websockets/v3',
    appId,
    token,
  });
  await client.connect();
  console.log('[deriv] authorised');

  const initialState = (await db.getAccountState(userId)) ?? {
    balance: 0,
    dailyStartingBalance: 0,
    dailyPnl: 0,
    dailyLossHit: false,
    dailyProfitHit: false,
    cooldownUntil: null,
    lastResetDate: new Date().toISOString().slice(0, 10),
  };

  const risk = new RiskGuard({
    dailyLossLimitPct: cfg.daily_loss_limit_pct,
    dailyProfitTargetPct: cfg.daily_profit_target_pct,
    cooldownMinutes: cfg.cooldown_minutes,
    cycleRiskCapPct: cfg.cycle_risk_cap_pct,
    minPayoutPct: cfg.min_payout_percent,
  }, initialState);

  const martingale = new MartingaleController({
    initialStake: cfg.initial_stake || tier.initialStake,
    multiplier: cfg.martingale_multiplier,
    maxSteps: cfg.max_steps || tier.maxSteps,
  });

  const settlement = new SettlementMonitor(client, (err) => console.error('[settlement]', err.message));

  const engine = new TradingEngine(userId, client, martingale, risk, settlement, {
    buyThreshold: cfg.buy_threshold,
    sellThreshold: cfg.sell_threshold,
    demoMode: cfg.demo_mode,
    enableRecoveryMarketSwitching: cfg.enable_recovery_market_switching,
    maxRecoverySwitchesPerCycle: cfg.max_recovery_switches_per_cycle,
    recoveryMarketMinSignalScore: cfg.recovery_market_min_signal_score,
    recoveryMarketPreference: cfg.recovery_market_preference as 'highest_score' | 'same_symbol' | 'disabled',
    contractDurationTicks: 5,
    currency: 'USD',
  });
  await engine.init();
  wireEngineToWs(userId, engine, wsServer);

  const heartbeat = new Heartbeat(client, risk, {
    onBalance: (balance) => db.upsertAccountState(userId, risk.state()).catch(() => {}),
    onDailyReset: (_today) => db.upsertAccountState(userId, risk.state()).catch(() => {}),
    onCooldownExpired: () => db.upsertAccountState(userId, risk.state()).catch(() => {}),
    onError: (err) => console.error('[heartbeat]', err.message),
  });
  heartbeat.start();

  if (cfg.trading_enabled) engine.start();
  engines.set(userId, engine);
  return engine;
}

const port = Number(process.env.PORT ?? 4000);
httpServer.listen(port, async () => {
  console.log(`[server] listening on http://localhost:${port}`);
  console.log(`[server] demo mode: ${process.env.DEMO_MODE === 'true'}`);
  try {
    await bootstrapEngine('demo-user');
  } catch (err) {
    console.error('[server] engine bootstrap failed:', (err as Error).message);
  }
});

process.on('SIGTERM', () => {
  for (const e of engines.values()) e.shutdown().catch(() => {});
  httpServer.close();
});
