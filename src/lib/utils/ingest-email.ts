/**
 * Generate a unique ingest email address for a user.
 * Uses the first 8 hex chars of their UUID (stripped of dashes).
 * Collision probability is negligible at early scale.
 */
export function generateIngestEmail(userId: string): string {
  const shortId = userId.replace(/-/g, "").slice(0, 8);
  const domain = process.env.NEXT_PUBLIC_APP_URL?.includes("localhost")
    ? "lingar.app"
    : new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://lingar.app").hostname;
  return `${shortId}@${domain}`;
}
