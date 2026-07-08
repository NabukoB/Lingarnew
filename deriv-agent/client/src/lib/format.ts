export function usd(n: number, dp = 2): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  return `${sign}$${abs.toFixed(dp)}`;
}

export function pct(n: number, dp = 1): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(dp)}%`;
}

export function short(sym: string): string {
  return sym.replace(/^R_/, 'V').replace(/^1HZ/, 'V').replace(/V(\d+)$/, 'V$1');
}

export function timeAgo(epoch: number): string {
  const s = Math.floor((Date.now() - epoch) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export function countdown(ms: number): string {
  if (ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}
