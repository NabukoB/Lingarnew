import { useEffect, useRef, useState } from 'react';
import { useMarketStore } from '../lib/store';

interface Options {
  token: string | null;
  url?: string;
}

interface Api {
  sendCommand: (cmd: unknown) => void;
  connected: boolean;
}

/** WS client with auto-reconnect + exponential backoff. */
export function useMarketWebSocket({ token, url }: Options): Api {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const backoff = useRef(1000);
  const onEvent = useMarketStore((s) => s.onEvent);
  const setConn = useMarketStore((s) => s.setConnected);

  useEffect(() => {
    if (!token) return;
    let closed = false;
    const target = url ?? `ws://${window.location.host}/ws?token=${encodeURIComponent(token)}`;

    const connect = () => {
      const ws = new WebSocket(target);
      wsRef.current = ws;
      ws.onopen = () => {
        backoff.current = 1000;
        setConnected(true);
        setConn(true);
      };
      ws.onmessage = (ev) => {
        try {
          onEvent(JSON.parse(ev.data));
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        setConnected(false);
        setConn(false);
        if (!closed) {
          setTimeout(connect, backoff.current);
          backoff.current = Math.min(backoff.current * 2, 30_000);
        }
      };
      ws.onerror = () => ws.close();
    };
    connect();
    return () => {
      closed = true;
      wsRef.current?.close();
    };
  }, [token, url, onEvent, setConn]);

  return {
    connected,
    sendCommand: (cmd) => {
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(cmd));
    },
  };
}
