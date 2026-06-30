export function coercePrice(raw: number | string | null): number | null {
  if (raw === null) return null;

  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }

  if (typeof raw === "string") {
    const parsed = parseFloat(raw.replace(/,/g, ""));
    if (Number.isNaN(parsed)) return null;
    return parsed > 0 ? parsed : null;
  }

  return null;
}
