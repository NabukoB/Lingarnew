export type ChartBox = {
  /** left x of the first point */
  x0: number;
  /** x of the last point */
  x1: number;
  /** baseline y (value 0) */
  y0: number;
  /** pixel height of `max` */
  height: number;
  /** value drawn at the top */
  max: number;
};

export function pointAt(values: number[], i: number, box: ChartBox): { x: number; y: number } {
  const n = values.length;
  const x = n <= 1 ? box.x0 : box.x0 + (i * (box.x1 - box.x0)) / (n - 1);
  const v = values[i] ?? 0;
  const y = box.y0 - (Math.min(v, box.max) / box.max) * box.height;
  return { x, y };
}

/** SVG path "M x,y L x,y …" through every value. */
export function linePath(values: number[], box: ChartBox): string {
  return values
    .map((_, i) => {
      const { x, y } = pointAt(values, i, box);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/** Closed path under the line, down to the baseline, for an area fill. */
export function areaPath(values: number[], box: ChartBox): string {
  if (values.length === 0) return "";
  return `${linePath(values, box)} L${box.x1},${box.y0} L${box.x0},${box.y0} Z`;
}

/** A tidy axis maximum at or above the largest value (1, 2, 2.5, 5 × 10ⁿ steps). */
export function niceMax(values: number[]): number {
  const top = Math.max(0, ...values);
  if (top === 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(top)));
  for (const step of [1, 2, 2.5, 3, 5, 10]) {
    if (step * exp >= top) return step * exp;
  }
  return 10 * exp;
}
