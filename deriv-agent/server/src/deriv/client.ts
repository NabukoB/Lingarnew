import WebSocket from 'ws';
import { EventEmitter } from 'node:events';
import type { DerivRequest, DerivResponse } from './types.js';

type SubscriptionHandler = (msg: DerivResponse) => void;

interface Pending {
  resolve: (value: DerivResponse) => void;
  reject: (err: Error) => void;
  timeout: NodeJS.Timeout;
}

export interface DerivClientOptions {
  endpoint: string;
  appId: string;
  token: string;
  requestTimeoutMs?: number;
  maxBackoffMs?: number;
}

/**
 * Persistent Deriv WebSocket client. Handles reconnect + re-auth. Send() is
 * request/response, subscribe() streams pushes to a handler until it returns
 * false. On reconnect all previously registered subscriptions are re-sent.
 */
export class DerivClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private nextReqId = 1;
  private pending = new Map<number, Pending>();
  private handlers = new Map<string, SubscriptionHandler>(); // subscription.id -> handler
  private resubscribers: Array<() => void> = [];
  private backoffMs = 1000;
  private closed = false;
  private connected = false;
  private connectPromise: Promise<void> | null = null;

  constructor(private readonly opts: DerivClientOptions) {
    super();
  }

  isConnected() {
    return this.connected;
  }

  async connect(): Promise<void> {
    if (this.connectPromise) return this.connectPromise;
    this.connectPromise = new Promise<void>((resolve, reject) => {
      const url = `${this.opts.endpoint}?app_id=${encodeURIComponent(this.opts.appId)}`;
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.on('open', async () => {
        try {
          await this.authorize();
          this.connected = true;
          this.backoffMs = 1000;
          this.emit('open');
          resolve();
          // Replay subscriptions (skip on first connect where none exist).
          for (const fn of this.resubscribers) fn();
        } catch (err) {
          reject(err as Error);
          ws.close();
        }
      });

      ws.on('message', (raw) => this.onMessage(raw.toString()));

      ws.on('close', () => {
        this.connected = false;
        this.connectPromise = null;
        this.emit('close');
        this.rejectAllPending(new Error('connection closed'));
        if (!this.closed) this.scheduleReconnect();
      });

      ws.on('error', (err) => this.emit('error', err));
    });
    return this.connectPromise;
  }

  close() {
    this.closed = true;
    this.ws?.close();
  }

  /** Send a request and await its response. */
  send<T extends DerivResponse = DerivResponse>(req: DerivRequest): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('not connected'));
    }
    const reqId = this.nextReqId++;
    const payload = { ...req, req_id: reqId };
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(reqId);
        reject(new Error(`request timeout: ${JSON.stringify(req)}`));
      }, this.opts.requestTimeoutMs ?? 15000);
      this.pending.set(reqId, {
        resolve: (msg) => resolve(msg as T),
        reject,
        timeout,
      });
      this.ws!.send(JSON.stringify(payload));
    });
  }

  /**
   * Register a subscription. `req` must include `subscribe: 1`. `onMessage`
   * fires for the initial response and every subsequent push. Returns an
   * unsubscribe function.
   */
  async subscribe(req: DerivRequest, onMessage: SubscriptionHandler): Promise<() => Promise<void>> {
    const runSubscribe = async () => {
      const first = await this.send({ ...req, subscribe: 1 });
      if (first.error) throw new Error(`subscribe error: ${first.error.message}`);
      const subId = first.subscription?.id;
      if (subId) this.handlers.set(subId, onMessage);
      onMessage(first);
      return subId ?? null;
    };
    let currentSubId = await runSubscribe();
    const resubscribe = () => {
      runSubscribe()
        .then((id) => {
          currentSubId = id;
        })
        .catch((err) => this.emit('error', err));
    };
    this.resubscribers.push(resubscribe);
    return async () => {
      this.resubscribers = this.resubscribers.filter((f) => f !== resubscribe);
      if (currentSubId) {
        this.handlers.delete(currentSubId);
        try {
          await this.send({ forget: currentSubId });
        } catch {
          /* connection may already be gone */
        }
      }
    };
  }

  private async authorize() {
    const res = await this.send({ authorize: this.opts.token });
    if (res.error) throw new Error(`authorize failed: ${res.error.message}`);
    this.emit('authorized', res.authorize);
  }

  private onMessage(raw: string) {
    let msg: DerivResponse;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    // Subscription push?
    const subId = msg.subscription?.id;
    if (subId) {
      const handler = this.handlers.get(subId);
      if (handler) {
        // First-response messages are also delivered via subscribe(); the
        // pending map still resolves them below with req_id.
        if (msg.req_id === undefined) {
          handler(msg);
          return;
        }
      }
    }

    // Request/response
    if (msg.req_id !== undefined) {
      const p = this.pending.get(msg.req_id);
      if (p) {
        clearTimeout(p.timeout);
        this.pending.delete(msg.req_id);
        p.resolve(msg);
      }
    }
  }

  private rejectAllPending(err: Error) {
    for (const [, p] of this.pending) {
      clearTimeout(p.timeout);
      p.reject(err);
    }
    this.pending.clear();
  }

  private scheduleReconnect() {
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, this.opts.maxBackoffMs ?? 30000);
    setTimeout(() => {
      if (this.closed) return;
      this.connect().catch((err) => this.emit('error', err));
    }, delay);
  }
}
