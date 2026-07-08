import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import superjson from 'superjson';
import * as db from '../db/queries.js';

interface Context {
  userId: string;
}

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const appRouter = t.router({
  ping: t.procedure.query(() => ({ ok: true, ts: Date.now() })),

  config: t.router({
    get: t.procedure.query(async ({ ctx }) => db.getConfig(ctx.userId)),
    update: t.procedure
      .input(
        z.object({
          trading_enabled: z.boolean().optional(),
          account_tier: z.number().optional(),
          martingale_multiplier: z.number().min(1.3).max(2.0).optional(),
          buy_threshold: z.number().min(50).max(95).optional(),
          sell_threshold: z.number().min(5).max(50).optional(),
          daily_loss_limit_pct: z.number().min(1).max(50).optional(),
          daily_profit_target_pct: z.number().min(1).max(50).optional(),
          enable_recovery_market_switching: z.boolean().optional(),
          max_recovery_switches_per_cycle: z.number().min(0).max(5).optional(),
          recovery_market_min_signal_score: z.number().min(0).max(100).optional(),
          stop_mode: z.enum(['immediate', 'after_settlement', 'after_cycle']).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => db.upsertConfig(ctx.userId, input)),
    setEnabled: t.procedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => db.upsertConfig(ctx.userId, { trading_enabled: input.enabled })),
  }),

  state: t.router({
    account: t.procedure.query(async ({ ctx }) => db.getAccountState(ctx.userId)),
    activeCycle: t.procedure.query(async ({ ctx }) => db.getActiveCycle(ctx.userId)),
  }),
});

export type AppRouter = typeof appRouter;
