import { z } from 'zod';
import type { TradingEngine } from '../trading/engine.js';

const command = z.discriminatedUnion('type', [
  z.object({ type: z.literal('pause') }),
  z.object({ type: z.literal('resume') }),
  z.object({
    type: z.literal('stop'),
    mode: z.enum(['immediate', 'after_settlement', 'after_cycle']),
  }),
  z.object({ type: z.literal('cancel_proposal'), proposalId: z.string() }),
  z.object({ type: z.literal('close_early'), contractId: z.string() }),
  z.object({
    type: z.literal('skip_signal'),
    symbol: z.string(),
    blacklistMinutes: z.number().optional(),
  }),
  z.object({ type: z.literal('subscribe'), symbols: z.array(z.string()) }),
  z.object({ type: z.literal('unsubscribe'), symbols: z.array(z.string()) }),
]);

interface ClientLike {
  subscriptions: Set<string>;
}

export async function handleCommand(
  engine: TradingEngine,
  client: ClientLike,
  raw: unknown,
): Promise<void> {
  const parsed = command.safeParse(raw);
  if (!parsed.success) return;
  const cmd = parsed.data;
  switch (cmd.type) {
    case 'pause':
      engine.pause();
      return;
    case 'resume':
      engine.resume();
      return;
    case 'stop':
      await engine.stop(cmd.mode);
      return;
    case 'cancel_proposal':
      // Proposals are ephemeral in this build (auto-consumed by buy); log
      // the ack so the UI clears its pending state.
      engine.ackIntervention('cancel_proposal', { proposalId: cmd.proposalId });
      return;
    case 'close_early':
      await engine.closeOpenContractEarly(cmd.contractId);
      return;
    case 'skip_signal':
      engine.skipSignal(cmd.symbol, cmd.blacklistMinutes);
      return;
    case 'subscribe':
      for (const s of cmd.symbols) client.subscriptions.add(s);
      return;
    case 'unsubscribe':
      for (const s of cmd.symbols) client.subscriptions.delete(s);
      return;
  }
}
