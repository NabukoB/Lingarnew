import twilio from "twilio";

export interface IncomingMessage {
  from: string;
  text: string;
  messageSid: string;
}

// Twilio delivers WhatsApp webhooks as application/x-www-form-urlencoded,
// so `body` here is a plain string map, not JSON.
export function parseIncomingMessage(
  body: Record<string, string> | undefined,
): IncomingMessage | null {
  if (!body?.From || !body.Body) return null;
  return {
    from: body.From,
    text: body.Body,
    messageSid: body.MessageSid ?? "",
  };
}

// Twilio HMAC-signs every webhook with the account's auth token. When we know
// our public URL, verify the signature so someone else can't forge inbound
// messages. See https://www.twilio.com/docs/usage/webhooks/webhooks-security
export function verifySignature(
  authToken: string,
  publicUrl: string,
  signature: string | undefined,
  body: Record<string, string>,
): boolean {
  if (!signature) return false;
  const url = new URL("/webhook", publicUrl).toString();
  return twilio.validateRequest(authToken, signature, url, body);
}

let cachedClient: twilio.Twilio | null = null;
function getClient(): twilio.Twilio {
  if (cachedClient) return cachedClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error(
      "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set",
    );
  }
  cachedClient = twilio(sid, token);
  return cachedClient;
}

export async function sendWhatsAppMessage(
  to: string,
  body: string,
): Promise<void> {
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) {
    throw new Error("TWILIO_WHATSAPP_FROM must be set");
  }
  await getClient().messages.create({ from, to, body });
}
