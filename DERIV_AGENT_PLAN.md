# Deriv Volatility Indices Trading Agent — Unified Implementation Plan

## Context

Four attached PDFs — `plan_1.pdf` (overall design), `todo.pdf` (checklist),
`marketmonitoringandinterventionplan.pdf` (real-time monitoring +
intervention), and `gapclosureandrecoveryplan.pdf` (10 critical gaps +
multi-market recovery) — collectively describe an autonomous Deriv trading
agent that:

- Connects to Deriv's WebSocket API and streams ticks/OHLC for all Volatility
  Indices (V10 / V25 / V50 / V75 / V100 and 1s variants).
- Scores every `(symbol × contract_type)` pair with a multi-indicator signal
  engine (RSI, MACD, BB, EMA, ATR, candle patterns) and only enters when
  confidence is high.
- Sizes stakes via an account-tier-aware Martingale controller (1.3×–2.0×,
  4–5 max steps) with hard stop rules, daily loss/profit gates, and cooldowns.
- Optionally switches markets mid-cycle to the highest-scoring alternative
  when recovery is required.
- Runs 24/7 as an always-on service and streams live data + intervention
  controls to a React dashboard (pause / stop-modes / cancel / close-early /
  skip).

The current Lingarnew repo contains **no Deriv code** — `trading-bot/` is an
unrelated Alpaca stocks bot. Per user confirmation, this is a **greenfield
build in a new `deriv-agent/` subfolder** of Lingarnew; the todo.pdf's
"Phase 1–4 complete" status refers to a different environment and is ignored.
The 10 "gap fixes" from `gapclosureandrecoveryplan.pdf` are therefore
integrated inline into the build phases rather than treated as follow-up
patches on existing code.

Intended outcome: a self-contained, deployable Deriv trading agent that
runs demo-first, is safe to expose to a live account, and can be monitored
and manually controlled from a web dashboard.

## Approach

Build the agent in a new top-level folder `deriv-agent/` with a
TypeScript Express + tRPC backend, React (Vite) frontend, and Supabase
Postgres for persistence — matching Lingarnew's existing stack choices where
possible so a single Vercel deploy can host both apps if desired.

The build proceeds bottom-up: exchange integration → signal engine →
risk-managed execution → persistence → streaming → UI. Real-time monitoring
and intervention (PDF 3) reuses the same WebSocket server used for
frontend event streaming, so those two workstreams are merged. The
recovery strategy (PDF 4 Part B) plugs into the Martingale controller
after the base cycle logic works.

Demo-first: every phase is validated against a Deriv demo account before
touching a live token. A master `tradingEnabled` toggle + `demoMode` flag
gate every trade.

## Target folder layout

```
deriv-agent/
  package.json                    # workspace root (npm workspaces)
  server/
    package.json
    src/
      index.ts                    # Express bootstrap + tRPC + WS upgrade
      deriv/
        client.ts                 # WebSocket client + auth + reconnect
        symbols.ts                # active_symbols discovery
        ticks.ts                  # tick + ticks_history subscriptions
        proposal.ts               # proposal + buy
        portfolio.ts              # settlement polling
        balance.ts                # balance + subscribe
      signals/
        indicators.ts             # RSI, MACD, BB, EMA, ATR
        patterns.ts               # engulfing, pin bar
        engine.ts                 # per-(symbol × contract_type) scorer
        regime.ts                 # contract type selector by market regime
      trading/
        martingale.ts             # stake progression + cycle state
        risk-guard.ts             # daily limits, cooldown, cycle risk cap
        recovery.ts               # multi-market recovery selection
        engine.ts                 # top-level TradingEngine orchestration
        settlement-monitor.ts     # portfolio polling → outcomes
        heartbeat.ts              # 30s balance sync + daily reset + cooldown expiry
      ws/
        server.ts                 # WS server for dashboard streaming
        broadcast.ts              # tick/ohlc/signal/trade/balance broadcasters
        intervention-handlers.ts  # pause/stop/cancel/close-early/skip commands
      trpc/
        router.ts
        procedures/
          config.ts               # get/set config, master toggle
          state.ts                # snapshot of engine/cycle/risk state
          history.ts              # trades, cycles, interventions
      db/
        client.ts                 # Supabase client
        queries.ts                # typed CRUD helpers
    tests/
      indicators.test.ts
      martingale.test.ts
      risk-guard.test.ts
      recovery.test.ts
      settlement-monitor.test.ts
  client/
    package.json
    src/
      App.tsx
      hooks/
        useMarketWebSocket.ts     # WS client + reconnect
        useTradingState.ts        # tRPC-backed engine snapshot
      components/
        SignalHeatmap.tsx         # grid, drill-down, recovery alternatives
        MarketMonitor.tsx         # candlestick chart + indicators
        TickerPanel.tsx
        ActiveTradeCard.tsx       # live P&L, close-early, skip
        ConfigPanel.tsx           # tier, multiplier, thresholds, master toggle
        StatsPanel.tsx
        ControlBar.tsx            # pause/resume/stop with stop-mode modal
        RiskDashboard.tsx         # daily P&L bar, cooldown countdown
      lib/
        colors.ts                 # signal score → colour
        format.ts
  supabase/
    migrations/
      0001_init.sql               # users, trading_config, trades, trading_cycles,
                                  # account_state, signal_history, intervention_log,
                                  # recovery_market_selection
```

## Consolidated build phases

Each phase closes specific PDF items — gap numbers refer to
`gapclosureandrecoveryplan.pdf` Part A.

### Phase 0 — Scaffold

- `deriv-agent/` workspace with `server/` and `client/`.
- TypeScript strict; ESLint + Prettier.
- Supabase project + migration `0001_init.sql` creating **all** tables the
  four PDFs require at once (trades, trading_cycles, trading_config,
  account_state, signal_history, intervention_log,
  recovery_market_selection). Building the full schema upfront avoids the
  cascade of `ALTER TABLE` statements that plan_1 + gap-closure + market-
  monitor PDFs each add separately.
- `.env.example`: `DERIV_APP_ID`, `DERIV_API_TOKEN`, `DERIV_ENDPOINT`
  (default `wss://ws.binaryws.com/websockets/v3`), Supabase URL/keys,
  `DEMO_MODE=true`.

### Phase 1 — Deriv WebSocket integration (plan_1 Phase 1)

- `server/src/deriv/client.ts`: persistent WS with `authorize` on connect,
  exponential-backoff reconnect + re-authorise, request/response
  correlation by `req_id`.
- `symbols.ts`: `active_symbols` filtered to `market=synthetic_index`.
- `ticks.ts`: subscribe to tick + 1m/5m OHLC per symbol; seed each symbol's
  ring buffer with ≥50 historical candles via `ticks_history` before the
  engine evaluates it.
- `balance.ts`: `balance + subscribe:1` fed straight into `account_state`.

### Phase 2 — Signal engine (plan_1 Phase 2 + Gap 9)

- `indicators.ts`: pure functions — RSI(14), MACD(12/26/9),
  BollingerBands(20, 2σ), EMA(9)/EMA(21), ATR(14).
- `patterns.ts`: engulfing + pin-bar detectors on the last 3 candles.
- `engine.ts`: composite score 0–100 with the exact weights from
  plan_1.pdf (RSI×2, MACD×2, BB×1.5, EMA×1.5, pattern×1). Returns a
  score **per contract type** (rise_fall, higher_lower, digits) in one
  call — closes Gap 9 by design instead of retrofitting later.
- `regime.ts`: `selectContractType` picks the highest-scoring type using
  regime rules (directional → rise/fall, ranging → higher/lower, low-vol
  → digits) — closes Gap 3.

### Phase 3 — Martingale controller + risk guard (plan_1 Phase 3)

- `martingale.ts`: tier-driven initial stake, multiplier 1.3×–2.0×
  (default 1.5×), max 4–5 steps per tier, `recordTrade(step, stake,
  payoutPct, outcome)` returns next-step or cycle-end.
- `risk-guard.ts`: daily loss / profit gates, cooldown timer, no-overlap
  rule, `calculateCycleRiskCap()` called **before** every proposal (not
  after) — closes Gap 4. Auto-scales initial stake down if cap breached.
- Break-even payout check per step (reject step if required payout > 95%
  makes recovery impossible).

### Phase 4 — Trade execution + settlement monitoring (plan_1 Phase 4 + Gaps 1, 7)

- `proposal.ts`: `proposal` call, validate payout ≥ 75%, then `buy`.
- `settlement-monitor.ts`: after every buy, register the contract_id and
  poll `portfolio` every 2–5 s until `status ∈ {won, lost}`; then read
  actual `payout`/`profit` from `profit_table` — closes Gap 1.
- `trading/engine.ts.handleSettlement()`: writes outcome to `trades`,
  calls `martingale.recordTrade()`, advances cycle or ends cycle, calls
  `riskGuard.updateAfterTrade(profit)` and `startCooldown()` on failure —
  closes Gaps 5 and 7.

### Phase 5 — Persistence & state recovery (Gap 2)

- Every cycle start writes a `trading_cycles` row; every settlement
  updates step / total_staked / total_pnl.
- `account_state` holds `dailyPnL`, `dailyStartingBalance`,
  `dailyLossHit`, `dailyProfitHit`, `cooldownUntil`, `lastResetDate`.
- On engine boot: load the active (unresolved) cycle, if any, and rebuild
  Martingale controller state so restarts don't reset a cycle mid-flight.

### Phase 6 — Heartbeat, daily reset, cooldown expiry (Gaps 6, 10)

- `heartbeat.ts`: `setInterval(30_000)` — sync balance, check date roll
  → `resetDailyLimits()`, check `cooldownUntil < now` → `endCooldown()`,
  emit `heartbeat` WS event.
- Timezone anchored to UTC (0000 UTC daily reset).

### Phase 7 — Multi-market recovery strategy (gap-closure PDF Part B)

- `recovery.ts`: at every cycle step **after** a loss, rank all symbols by
  the current per-contract-type signal score, exclude the previous symbol
  and any below `recoveryMarketMinSignalScore` (default 60), return top-N.
- `TradingEngine.attemptTrade()` consumes the ranked list when
  `enableRecoveryMarketSwitching` is on and `step > 1`; stake progression
  is unchanged.
- Every switch writes to `recovery_market_selection` and flags the
  `trades` row (`recovery_market_switch`, `original_symbol`,
  `recovery_reason`).
- Guard: `maxRecoverySwitchesPerCycle` (default 2) hard-caps switches.

### Phase 8 — WebSocket streaming + intervention commands (market-monitor PDF Parts 1, 3, 5)

- `ws/server.ts`: WebSocket upgrade on the same HTTP server as tRPC
  (Option B in the PDF); auth by short-lived JWT from tRPC login.
- Broadcast schema exactly matches market-monitor PDF §1.2: `tick`,
  `ohlc`, `signal`, `trade`, `balance`, plus `heartbeat` and
  `intervention_ack`.
- `intervention-handlers.ts` implements the command union from the PDF:
  `pause`, `resume`, `stop { mode: immediate|after_settlement|after_cycle }`,
  `cancel_proposal`, `close_early`, `skip_signal`, plus
  `subscribe/unsubscribe { symbols }`.
- `TradingEngine` methods: `pause()`, `resume()`,
  `stop(mode)`, `cancelPendingProposal()`,
  `closeOpenContractEarly(contractId)` (calls Deriv `sell_contract`),
  `skipSignal(symbol, blacklistMinutes)`.
- Every intervention writes to `intervention_log`.
- **Master toggle** (Gap 8): `tradingEnabled` column on `trading_config`,
  toggled via tRPC `config.setEnabled`, replaces the free-standing
  start/stop buttons.

### Phase 9 — Dashboard core UI (plan_1 Phase 5)

- `SignalHeatmap`: grid of all Volatility Index symbols colour-coded by
  composite score (0–100); highlight the currently traded symbol; click to
  drill into `MarketMonitor` for that symbol; when a cycle is active and
  recovery is enabled, decorate the top-3 recovery candidates.
- `ActiveTradeCard`: symbol, contract type, step, stake, entry price, live
  P&L, time-remaining countdown, break-even payout, `[Close Early]` and
  `[Skip]` buttons.
- `ConfigPanel`: API token (server-side only, never returned to client),
  account tier picker (auto-fills initial stake + max steps), multiplier
  slider, BUY/SELL thresholds, master `tradingEnabled` toggle, recovery
  toggle + limits, stop-mode picker.
- `RiskDashboard`: daily P&L progress bar with loss-limit + profit-target
  markers, cooldown countdown, cycle status.
- `StatsPanel`: win rate, cycle success rate, average steps, P&L by
  period (day / week / all-time).

### Phase 10 — Market monitor + live intervention UI (market-monitor PDF Parts 2, 4, 6)

- `MarketMonitor.tsx`: Recharts candlestick chart with RSI / MACD / BB /
  EMA overlays; current candle updates on every tick; zoom + pan; 1m/5m
  toggle.
- `TickerPanel.tsx`: bid/ask, signal score, RSI, MACD, BB position, EMA
  status — all live.
- `ControlBar.tsx`: pause / resume / stop (opens stop-mode modal),
  connection status dot, last-update timestamp.
- `useMarketWebSocket.ts`: WS client with reconnect + exponential
  backoff; typed event dispatch into per-symbol Zustand stores;
  `sendCommand()` for interventions with a pending-ack UI state.

### Phase 11 — UI polish (plan_1 Phase 6)

- Design tokens: colour palette, typography scale, spacing, shadows.
- Micro-interactions: score-change transitions, hover states, chart
  crosshair.
- Accessibility: focus rings, keyboard nav, ARIA labels on interactive
  controls; contrast-safe signal colours in light + dark.
- Loading skeletons for heatmap, chart, trade card; empty states.

### Phase 12 — Testing, demo validation, deployment (plan_1 Phase 7)

- Unit tests: indicators (fixtures with hand-computed expected values),
  Martingale progression (all tiers), risk guard limit enforcement,
  recovery selection ranking.
- Integration test: mocked Deriv WS replaying a recorded tick/OHLC/
  settlement stream through the full engine.
- E2E: Playwright script — start engine in demo mode, wait for one
  cycle to complete, assert dashboard state matches DB.
- Manual demo-mode session on a Deriv demo account for ≥ 24 h before any
  live-token deployment.
- Deploy backend as an always-on service (Vercel is not appropriate — use
  Fly.io / Railway / a small VPS). Frontend can go on Vercel and point at
  the backend origin.

## Reused patterns and components to note

- **Supabase client**: mirror the `src/lib/supabase/{server,client}.ts`
  pattern already in Lingarnew rather than inventing a new one.
- **Env loading + `.env.example`**: follow Lingarnew's existing layout so
  the dev experience is consistent.
- **Recharts is already in the Next.js frontend ecosystem the team
  uses** — market-monitor PDF §2.1 recommends it, and it satisfies the
  candlestick + overlay requirements without pulling in TradingView.
- **`ws` library** for the backend WebSocket server — market-monitor PDF
  notes it is already in dependencies for the target stack; add it fresh
  to `deriv-agent/server`.

## Verification

End-to-end validation, run after each major phase:

1. **Backend up**: `npm --workspace deriv-agent/server run dev` — expect
   `[deriv] authorised`, `[deriv] N symbols`, `[heartbeat] balance=$X`.
2. **Signal engine**: from a REPL / test harness, feed a canned 100-candle
   fixture through `engine.computeSignal` and assert scores for each
   contract type match hand-computed expected values.
3. **Martingale + risk guard**: unit tests cover cycle progression across
   all four account tiers, cycle-risk-cap auto-scaling, daily-limit hit,
   cooldown start/expiry.
4. **Settlement round-trip (demo)**: with `DEMO_MODE=true` and a Deriv
   demo token, trigger one trade, watch `settlement-monitor` mark it in
   `trades`, watch cycle advance in `trading_cycles`.
5. **Dashboard live path**: open the client, confirm heatmap, ticker,
   chart all update within 1 s of a tick; place a trade; watch the
   `ActiveTradeCard` update live; click `Close Early` and confirm the
   contract closes and cycle advances.
6. **Intervention commands**: exercise pause / resume / stop (each mode)
   / cancel_proposal / close_early / skip — every command must produce
   an `intervention_log` row and a WS `intervention_ack` event.
7. **Restart resilience**: kill and restart the server mid-cycle; the
   engine must reload the active cycle from `trading_cycles` and resume
   at the correct step.
8. **24 h demo soak**: run the agent for ≥ 24 h on demo before enabling
   any live token; confirm daily reset fires at 0000 UTC.
