export function generateIngestEmail(userId: string): string {
  const shortId = userId.replace(/-/g, "").slice(0, 8);
  const domain = process.env.INGEST_EMAIL_DOMAIN ?? "lingar.app";
  return `${shortId}@${domain}`;
}
