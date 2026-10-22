// Geometry for time-based line charts. Pure functions, unit-tested.

export type Scale = {
  /** time range shown, ms since epoch */
  t0: number;
  t1: number;
  /** plot box in px */
  x0: number;
  x1: number;
  yTop: number;
  yBase: number;
  /** value drawn at yTop */
  max: number;
};

export function xOf(t: number, s: Scale): number {
  const span = s.t1 - s.t0 || 1;
  return s.x0 + ((t - s.t0) / span) * (s.x1 - s.x0);
}

export function yOf(v: number, s: Scale): number {
  const clamped = Math.max(0, Math.min(v, s.max));
  return s.yBase - (clamped / (s.max || 1)) * (s.yBase - s.yTop);
}

/**
 * Line through the points; a gap longer than `gapMs` (the router was
 * unreachable) lifts the pen instead of drawing a straight bridge.
 */
export function timeLine(times: number[], values: number[], s: Scale, gapMs: number): string {
  let d = "";
  for (let i = 0; i < times.length; i++) {
    const jump = i === 0 || times[i]! - times[i - 1]! > gapMs;
    d += `${jump ? "M" : "L"}${xOf(times[i]!, s).toFixed(1)},${yOf(values[i]!, s).toFixed(1)}`;
  }
  return d;
}

/** Closed areas under each unbroken run of the line. */
export function timeArea(times: number[], values: number[], s: Scale, gapMs: number): string {
  let d = "";
  let start = 0;
  for (let i = 1; i <= times.length; i++) {
    if (i === times.length || times[i]! - times[i - 1]! > gapMs) {
      const ts = times.slice(start, i);
      const vs = values.slice(start, i);
      if (ts.length > 1) {
        d += timeLine(ts, vs, s, Infinity) + `L${xOf(ts[ts.length - 1]!, s).toFixed(1)},${s.yBase}L${xOf(ts[0]!, s).toFixed(1)},${s.yBase}Z`;
      }
      start = i;
    }
  }
  return d;
}

/** Index of the point closest in time to t (times sorted ascending). */
export function nearestIndex(times: number[], t: number): number {
  if (times.length === 0) return -1;
  let lo = 0;
  let hi = times.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (times[mid]! < t) lo = mid;
    else hi = mid;
  }
  return Math.abs(times[lo]! - t) <= Math.abs(times[hi]! - t) ? lo : hi;
}

/** A clean axis top at or above max: 1, 2, 2.5, 5 × 10ⁿ. */
export function niceTop(max: number): number {
  if (max <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  for (const step of [1, 2, 2.5, 5, 10]) if (step * exp >= max) return step * exp;
  return 10 * exp;
}
