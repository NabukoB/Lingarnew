-- Deriv Volatility Indices Trading Agent — initial schema.
-- One migration creates every table referenced across plan_1, gap-closure,
-- and market-monitor PDFs so subsequent ALTER TABLE churn is avoided.

create extension if not exists "pgcrypto";

-- Users --------------------------------------------------------------------
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);

-- Per-user trading configuration ------------------------------------------
create table if not exists trading_config (
  user_id uuid primary key references users(id) on delete cascade,

  -- Master gates
  trading_enabled boolean not null default false,
  demo_mode boolean not null default true,

  -- Account tier ($100 / $250 / $500 / $1000)
  account_tier integer not null default 100,
  initial_stake numeric(10,2) not null default 0.20,
  max_steps integer not null default 4,
  martingale_multiplier numeric(4,2) not null default 1.50,

  -- Signal thresholds
  buy_threshold integer not null default 70,
  sell_threshold integer not null default 30,
  min_payout_percent numeric(5,2) not null default 75.00,

  -- Risk limits
  daily_loss_limit_pct numeric(5,2) not null default 10.00,
  daily_profit_target_pct numeric(5,2) not null default 15.00,
  cooldown_minutes integer not null default 30,
  cycle_risk_cap_pct numeric(5,2) not null default 20.00,

  -- Recovery strategy
  enable_recovery_market_switching boolean not null default true,
  max_recovery_switches_per_cycle integer not null default 2,
  recovery_market_min_signal_score integer not null default 60,
  recovery_market_preference text not null default 'highest_score',

  -- Intervention behaviour
  stop_mode text not null default 'after_settlement',
  pause_behaviour text not null default 'skip_signals',
  early_close_threshold numeric(5,2),
  blacklist_duration_minutes integer not null default 5,
  enable_alerts boolean not null default true,

  updated_at timestamptz not null default now()
);

-- Live-tracked account state (single row per user) ------------------------
create table if not exists account_state (
  user_id uuid primary key references users(id) on delete cascade,
  balance numeric(14,2) not null default 0,
  currency text not null default 'USD',
  daily_starting_balance numeric(14,2) not null default 0,
  daily_pnl numeric(14,2) not null default 0,
  daily_loss_hit boolean not null default false,
  daily_profit_hit boolean not null default false,
  cooldown_until timestamptz,
  last_reset_date date not null default (now() at time zone 'utc')::date,
  updated_at timestamptz not null default now()
);

-- Cycles -------------------------------------------------------------------
create table if not exists trading_cycles (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  entry_symbol text not null,
  current_symbol text not null,
  contract_type text not null,
  status text not null default 'active',        -- active | won | failed | stopped
  step integer not null default 0,
  total_staked numeric(14,2) not null default 0,
  total_pnl numeric(14,2) not null default 0,
  recovery_switches integer not null default 0,
  recovery_markets_used jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  paused_at timestamptz,
  stopped_at timestamptz,
  stop_reason text
);

create index if not exists trading_cycles_user_active_idx
  on trading_cycles (user_id) where status = 'active';

-- Trades -------------------------------------------------------------------
create table if not exists trades (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  cycle_id bigint references trading_cycles(id) on delete cascade,
  step integer not null,
  symbol text not null,
  original_symbol text,
  contract_type text not null,
  direction text not null,                      -- rise | fall | higher | lower | over | under
  stake numeric(10,2) not null,
  payout_percent numeric(5,2),
  proposal_id text,
  contract_id text,
  entry_price numeric(14,4),
  exit_price numeric(14,4),
  outcome text not null default 'pending',      -- pending | win | loss | cancelled
  profit numeric(14,2),
  signal_score integer,
  recovery_market_switch boolean not null default false,
  recovery_reason text,
  closed_early boolean not null default false,
  closed_early_at timestamptz,
  closed_early_price numeric(14,4),
  skipped boolean not null default false,
  skipped_reason text,
  placed_at timestamptz not null default now(),
  settled_at timestamptz
);

create index if not exists trades_cycle_idx on trades (cycle_id);
create index if not exists trades_user_placed_idx on trades (user_id, placed_at desc);

-- Signal history ----------------------------------------------------------
create table if not exists signal_history (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  symbol text not null,
  contract_type text not null,
  composite_score integer not null,
  rsi_score integer,
  macd_score integer,
  bb_score integer,
  ema_score integer,
  atr_weight numeric(4,2),
  pattern_bonus integer,
  direction text,
  recorded_at timestamptz not null default now()
);

create index if not exists signal_history_recent_idx
  on signal_history (user_id, symbol, recorded_at desc);

-- Interventions log -------------------------------------------------------
create table if not exists intervention_log (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  action text not null,                         -- pause|resume|stop|cancel|close_early|skip
  symbol text,
  trade_id bigint references trades(id) on delete set null,
  reason text,
  timestamp timestamptz not null default now()
);

-- Recovery market selections ---------------------------------------------
create table if not exists recovery_market_selection (
  id bigserial primary key,
  cycle_id bigint not null references trading_cycles(id) on delete cascade,
  step integer not null,
  previous_symbol text,
  selected_symbol text not null,
  reason text,
  timestamp timestamptz not null default now()
);
