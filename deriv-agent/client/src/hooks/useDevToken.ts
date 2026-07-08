import { useEffect, useState } from 'react';

/** Dev-mode helper: fetches a demo JWT so the WS can authenticate. */
export function useDevToken(userId = 'demo-user'): string | null {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/dev/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
      .then((r) => r.json())
      .then((j) => setToken(j.token ?? null))
      .catch(() => setToken(null));
  }, [userId]);
  return token;
}
