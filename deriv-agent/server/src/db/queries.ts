import { getSupabase } from './client.js';
import type { CycleState } from '../trading/martingale.js';
import type { AccountRiskState } from '../trading/risk-guard.js';
import type { ContractType, SignalBreakdown } from '../signals/engine.js';

// ----- Config -------------------------------------------------------------

export interface TradingConfigRow {
  user_id: string;
  trading_enabled: boolean;
  demo_mode: boolean;
  account_tier: number;
  initial_stake: number;
  max_steps: number;
  martingale_multiplier: number;
  buy_threshold: number;
  sell_threshold: number;
  min_payout_percent: number;
  daily_loss_limit_pct: number;
  daily_profit_target_pct: number;
  cooldown_minutes: number;
  cycle_risk_cap_pct: number;
  enable_recovery_market_switching: boolean;
  max_recovery_switches_per_cycle: number;
  recovery_market_min_signal_score: number;
  recovery_market_preference: string;
  stop_mode: string;
  pause_behaviour: string;
  early_close_threshold: number | null;
  blacklist_duration_minutes: number;
  enable_alerts: boolean;
}

export async function getConfig(userId: string): Promise<TradingConfigRow | null> {
  const { data, error } = await getSupabase()
    .from('trading_config')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as TradingConfigRow | null;
}

export async function upsertConfig(
  userId: string,
  patch: Partial<TradingConfigRow>,
): Promise<TradingConfigRow> {
  const { data, error } = await getSupabase()
    .from('trading_config')
    .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data as TradingConfigRow;
}

// ----- Account state ------------------------------------------------------

export async function getAccountState(userId: string): Promise<AccountRiskState | null> {
  const { data, error } = await getSupabase()
    .from('account_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    balance: Number(data.balance),
    dailyStartingBalance: Number(data.daily_starting_balance),
    dailyPnl: Number(data.daily_pnl),
    dailyLossHit: Boolean(data.daily_loss_hit),
    dailyProfitHit: Boolean(data.daily_profit_hit),
    cooldownUntil: data.cooldown_until ? new Date(data.cooldown_until).getTime() : null,
    lastResetDate: String(data.last_reset_date),
  };
}

export async function upsertAccountState(
  userId: string,
  s: AccountRiskState,
): Promise<void> {
  const { error } = await getSupabase()
    .from('account_state')
    .upsert({
      user_id: userId,
      balance: s.balance,
      daily_starting_balance: s.dailyStartingBalance,
      daily_pnl: s.dailyPnl,
      daily_loss_hit: s.dailyLossHit,
      daily_profit_hit: s.dailyProfitHit,
      cooldown_until: s.cooldownUntil ? new Date(s.cooldownUntil).toISOString() : null,
      last_reset_date: s.lastResetDate,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  if (error) throw error;
}

// ----- Cycles -------------------------------------------------------------

export interface TradingCycleRow {
  id: number;
  user_id: string;
  entry_symbol: string;
  current_symbol: string;
  contract_type: string;
  status: 'active' | 'won' | 'failed' | 'stopped';
  step: number;
  total_staked: number;
  total_pnl: number;
  recovery_switches: number;
  recovery_markets_used: string[];
  started_at: string;
  ended_at: string | null;
}

export async function createCycle(
  userId: string,
  entrySymbol: string,
  contractType: ContractType,
): Promise<TradingCycleRow> {
  const { data, error } = await getSupabase()
    .from('trading_cycles')
    .insert({
      user_id: userId,
      entry_symbol: entrySymbol,
      current_symbol: entrySymbol,
      contract_type: contractType,
      status: 'active',
      recovery_markets_used: [entrySymbol],
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as TradingCycleRow;
}

export async function updateCycle(id: number, patch: Partial<TradingCycleRow>): Promise<void> {
  const { error } = await getSupabase().from('trading_cycles').update(patch).eq('id', id);
  if (error) throw error;
}

export async function endCycle(
  id: number,
  status: 'won' | 'failed' | 'stopped',
  stopReason?: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from('trading_cycles')
    .update({
      status,
      ended_at: new Date().toISOString(),
      stop_reason: stopReason ?? null,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function getActiveCycle(userId: string): Promise<TradingCycleRow | null> {
  const { data, error } = await getSupabase()
    .from('trading_cycles')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as TradingCycleRow | null;
}

// ----- Trades -------------------------------------------------------------

export interface TradeInsert {
  user_id: string;
  cycle_id: number;
  step: number;
  symbol: string;
  original_symbol?: string;
  contract_type: string;
  direction: string;
  stake: number;
  payout_percent?: number;
  proposal_id?: string;
  contract_id?: string;
  entry_price?: number;
  signal_score?: number;
  recovery_market_switch?: boolean;
  recovery_reason?: string;
}

export async function insertTrade(t: TradeInsert): Promise<{ id: number }> {
  const { data, error } = await getSupabase()
    .from('trades')
    .insert(t)
    .select('id')
    .single();
  if (error) throw error;
  return data as { id: number };
}

export interface TradeSettlementPatch {
  outcome: 'win' | 'loss' | 'cancelled';
  profit: number;
  exit_price?: number;
  settled_at?: string;
  closed_early?: boolean;
}

export async function settleTrade(id: number, patch: TradeSettlementPatch): Promise<void> {
  const { error } = await getSupabase()
    .from('trades')
    .update({
      ...patch,
      settled_at: patch.settled_at ?? new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

// ----- Signal history ----------------------------------------------------

export interface SignalHistoryInsert {
  user_id: string;
  symbol: string;
  contract_type: ContractType;
  breakdown: SignalBreakdown;
}

export async function recordSignal(h: SignalHistoryInsert): Promise<void> {
  const { breakdown: b } = h;
  const { error } = await getSupabase().from('signal_history').insert({
    user_id: h.user_id,
    symbol: h.symbol,
    contract_type: h.contract_type,
    composite_score: b.compositeScore,
    rsi_score: b.rsiScore,
    macd_score: b.macdScore,
    bb_score: b.bbScore,
    ema_score: b.emaScore,
    atr_weight: b.atrWeight,
    pattern_bonus: b.patternBonus,
    direction: b.direction,
  });
  if (error) throw error;
}

// ----- Intervention log --------------------------------------------------

export interface InterventionInsert {
  user_id: string;
  action: string;
  symbol?: string;
  trade_id?: number;
  reason?: string;
}

export async function logIntervention(i: InterventionInsert): Promise<void> {
  const { error } = await getSupabase().from('intervention_log').insert(i);
  if (error) throw error;
}

// ----- Recovery market selection -----------------------------------------

export interface RecoveryPickInsert {
  cycle_id: number;
  step: number;
  previous_symbol: string;
  selected_symbol: string;
  reason: string;
}

export async function logRecoveryPick(r: RecoveryPickInsert): Promise<void> {
  const { error } = await getSupabase().from('recovery_market_selection').insert(r);
  if (error) throw error;
}

// ----- Cycle state → controller reload -----------------------------------

/** Reload cycle state (for MartingaleController.restore) from DB row + last step. */
export function cycleRowToState(row: TradingCycleRow, currentStake: number): CycleState {
  return {
    step: row.step === 0 ? 1 : row.step,
    currentStake,
    totalStaked: Number(row.total_staked),
    totalPnl: Number(row.total_pnl),
    status: 'active',
  };
}
