const GRAPH_API_URL = "https://graph.facebook.com/v20.0";

export async function sendWhatsAppMessage({
  to,
  body,
}: {
  to: string;
  body: string;
}): Promise<string> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    throw new Error("WhatsApp env vars not configured");
  }

  const res = await fetch(`${GRAPH_API_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.status.toString());
    throw new Error(`WhatsApp send failed: ${err}`);
  }

  const data = (await res.json()) as { messages?: Array<{ id: string }> };
  const msgId = data.messages?.[0]?.id;
  if (!msgId) throw new Error("No message ID returned from WhatsApp API");
  return msgId;
}
