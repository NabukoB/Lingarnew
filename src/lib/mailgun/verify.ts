import crypto from "crypto";

/**
 * Verifies a Mailgun inbound webhook signature.
 * https://documentation.mailgun.com/docs/mailgun/user-manual/webhooks/#verify-webhook-signings
 *
 * The signing key lives under Mailgun > Webhooks (not the API key).
 */
export function verifyMailgunWebhook(params: {
  timestamp: string;
  token: string;
  signature: string;
}): boolean {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
  if (!signingKey) throw new Error("MAILGUN_WEBHOOK_SIGNING_KEY not set");

  const value = params.timestamp + params.token;
  const expected = crypto
    .createHmac("sha256", signingKey)
    .update(value)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(params.signature, "hex")
    );
  } catch {
    // Buffer.from throws if the hex string is malformed
    return false;
  }
}
