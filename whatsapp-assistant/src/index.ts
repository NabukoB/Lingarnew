import express from "express";
import { generateReply } from "./claude";
import { parseIncomingMessage, sendWhatsAppMessage } from "./whatsapp";

const app = express();
app.use(express.json());

// Webhook verification — Meta calls this once when you save the webhook URL.
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN &&
    typeof challenge === "string"
  ) {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
});

// Incoming message webhook.
app.post("/webhook", async (req, res) => {
  // Acknowledge fast so Meta doesn't retry; do the LLM work in the background.
  res.sendStatus(200);

  const incoming = parseIncomingMessage(req.body);
  if (!incoming) return;

  try {
    const reply = await generateReply(incoming.text);
    await sendWhatsAppMessage(incoming.from, reply);
    console.log(
      `[reply] to=${incoming.from} in=${JSON.stringify(incoming.text)} out=${JSON.stringify(reply)}`,
    );
  } catch (err) {
    console.error(`[error] to=${incoming.from}`, err);
  }
});

app.get("/", (_req, res) => {
  res.send("WhatsApp AI assistant is running.");
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`WhatsApp AI assistant listening on :${port}`);
});
