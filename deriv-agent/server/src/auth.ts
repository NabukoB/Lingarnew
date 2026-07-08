import jwt from 'jsonwebtoken';
import type { IncomingMessage } from 'node:http';

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET not set');
  return s;
}

export function signUserToken(userId: string): string {
  return jwt.sign({ sub: userId }, secret(), { expiresIn: '1h' });
}

export function verifyUserToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, secret()) as { sub?: string };
    return decoded.sub ?? null;
  } catch {
    return null;
  }
}

/** Verify auth from an upgrade request. Supports `?token=` or Authorization header. */
export function verifyRequestAuth(req: IncomingMessage): string | null {
  const auth = req.headers['authorization'];
  if (auth?.startsWith('Bearer ')) return verifyUserToken(auth.slice(7));
  const url = new URL(req.url ?? '/', 'http://localhost');
  const t = url.searchParams.get('token');
  return t ? verifyUserToken(t) : null;
}
