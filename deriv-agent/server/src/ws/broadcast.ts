import type { TradingEngine, EngineEvent } from '../trading/engine.js';
import type { MarketWebSocketServer } from './server.js';

/** Attach an engine's event stream to the WS broadcaster. */
export function wireEngineToWs(
  userId: string,
  engine: TradingEngine,
  wsServer: MarketWebSocketServer,
): () => void {
  const unsub = engine.on((e: EngineEvent) => {
    wsServer.broadcastToUser(userId, { ...e.payload, type: e.type, timestamp: e.timestamp });
  });
  return () => {
    unsub();
  };
}
