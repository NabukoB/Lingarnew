import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'node:http';
import type { TradingEngine } from '../trading/engine.js';
import { handleCommand } from './intervention-handlers.js';

interface Client {
  ws: WebSocket;
  userId: string;
  subscriptions: Set<string>;
}

/**
 * Frontend-facing WebSocket server. Each connection is authenticated by a
 * short-lived JWT passed on the `Authorization` header of the upgrade
 * request. Every engine event is broadcast to the matching user's sockets;
 * commands from the client are routed to intervention handlers.
 */
export class MarketWebSocketServer {
  private wss: WebSocketServer;
  private clients = new Set<Client>();
  private byUser = new Map<string, Set<Client>>();

  constructor(
    httpServer: HttpServer,
    private readonly engines: Map<string, TradingEngine>,
    private readonly verifyAuth: (req: import('node:http').IncomingMessage) => string | null,
  ) {
    this.wss = new WebSocketServer({ noServer: true });
    httpServer.on('upgrade', (req, socket, head) => {
      if (!req.url?.startsWith('/ws')) return;
      const userId = this.verifyAuth(req);
      if (!userId) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      this.wss.handleUpgrade(req, socket, head, (ws) => this.attach(userId, ws));
    });
  }

  private attach(userId: string, ws: WebSocket) {
    const client: Client = { ws, userId, subscriptions: new Set() };
    this.clients.add(client);
    const set = this.byUser.get(userId) ?? new Set<Client>();
    set.add(client);
    this.byUser.set(userId, set);

    ws.on('message', async (raw) => {
      let cmd: unknown;
      try {
        cmd = JSON.parse(raw.toString());
      } catch {
        return;
      }
      const engine = this.engines.get(userId);
      if (!engine) return;
      await handleCommand(engine, client, cmd).catch((err) => {
        this.send(ws, { type: 'error', message: (err as Error).message });
      });
    });

    ws.on('close', () => {
      this.clients.delete(client);
      const s = this.byUser.get(userId);
      if (s) {
        s.delete(client);
        if (s.size === 0) this.byUser.delete(userId);
      }
    });

    this.send(ws, { type: 'hello', ts: Date.now() });
  }

  broadcastToUser(userId: string, event: unknown) {
    const set = this.byUser.get(userId);
    if (!set) return;
    for (const c of set) {
      // Filter symbol-specific events by subscription (ticks/ohlc).
      const evt = event as { type?: string; symbol?: string };
      if (
        (evt.type === 'tick' || evt.type === 'ohlc') &&
        evt.symbol &&
        c.subscriptions.size > 0 &&
        !c.subscriptions.has(evt.symbol)
      ) {
        continue;
      }
      this.send(c.ws, event);
    }
  }

  private send(ws: WebSocket, msg: unknown) {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(msg));
  }
}
