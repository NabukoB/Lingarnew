const GRAPH_API_VERSION = "v20.0";

export interface IncomingMessage {
  from: string;
  text: string;
  messageId: string;
}

interface WhatsAppWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from: string;
          id: string;
          type: string;
          text?: { body: string };
        }>;
      };
    }>;
  }>;
}

export function parseIncomingMessage(
  body: unknown,
): IncomingMessage | null {
  const payload = body as WhatsAppWebhookPayload;
  const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message || message.type !== "text" || !message.text?.body) {
    return null;
  }
  return {
    from: message.from,
    text: message.text.body,
    messageId: message.id,
  };
}

export async function sendWhatsAppMessage(
  to: string,
  body: string,
): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !token) {
    throw new Error(
      "WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN must be set",
    );
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `WhatsApp send failed: ${response.status} ${response.statusText} — ${errText}`,
    );
  }
}
