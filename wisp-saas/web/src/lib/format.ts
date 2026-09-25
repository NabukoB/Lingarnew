/** Formats whole Kenyan shillings, e.g. 18420 → "KSh 18,420". */
export function formatKsh(amount: number): string {
  return "KSh " + Math.round(amount).toLocaleString("en-KE");
}

/** Short form for big totals, e.g. 542200 → "KSh 542.2K". */
export function formatKshShort(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return "KSh " + (amount / 1_000_000).toFixed(1) + "M";
  if (Math.abs(amount) >= 1_000) return "KSh " + (amount / 1_000).toFixed(1) + "K";
  return formatKsh(amount);
}

/** Percentage change from previous to current. Returns 0 when previous is 0. */
export function percentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/** "▲ 7.1%" / "▼ 3.3%" with the given number of decimals. */
export function formatDelta(pct: number, decimals = 1): string {
  const arrow = pct >= 0 ? "▲" : "▼";
  return `${arrow} ${Math.abs(pct).toFixed(decimals)}%`;
}

/**
 * Normalises a Kenyan mobile number to 2547XXXXXXXX / 2541XXXXXXXX
 * (the format M-Pesa expects). Returns null for anything else.
 */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, "").replace(/^\+/, "");
  let local: string;
  if (/^254[17]\d{8}$/.test(digits)) local = digits.slice(3);
  else if (/^0[17]\d{8}$/.test(digits)) local = digits.slice(1);
  else if (/^[17]\d{8}$/.test(digits)) local = digits;
  else return null;
  return "254" + local;
}

/** M-Pesa receipt codes are 10 upper-case letters and digits, e.g. RKT8765432. */
export function isMpesaReceipt(code: string): boolean {
  return /^[A-Z0-9]{10}$/.test(code.trim().toUpperCase());
}

/** Seconds → "23:58" (h:mm) when ≥ 1 hour, else "mm:ss". */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
