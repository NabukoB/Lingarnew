import crypto from "crypto";

/**
 * Verifies a Meta WhatsApp Cloud API webhook signature.
 * Header: X-Hub-Signature-256: sha256=<hex>
 * Key: WHATSAPP_APP_SECRET (Meta App Secret — NOT the access token)
 */
export function verifyWhatsAppSignature(
  rawBody: Buffer,
  signatureHeader: string | null
): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) throw new Error("WHATSAPP_APP_SECRET not set");
  if (!signatureHeader) return false;

  const [algo, receivedHex] = signatureHeader.split("=");
  if (algo !== "sha256" || !receivedHex) return false;

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(receivedHex, "hex")
    );
  } catch {
    return false;
  }
}
