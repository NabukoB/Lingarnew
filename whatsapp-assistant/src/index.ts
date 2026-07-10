import express from "express";
import { generateReply } from "./claude";
import {
  parseIncomingMessage,
  sendWhatsAppMessage,
  verifySignature,
} from "./whatsapp";

const app = express();
// Twilio posts form-encoded bodies, not JSON.
app.use(express.urlencoded({ extended: false }));

app.post("/webhook", async (req, res) => {
  const publicUrl = process.env.PUBLIC_URL;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (publicUrl && authToken) {
    const valid = verifySignature(
      authToken,
      publicUrl,
      req.header("X-Twilio-Signature") ?? undefined,
      req.body,
    );
    if (!valid) {
      res.sendStatus(403);
      return;
    }
  }

  // Acknowledge fast so Twilio doesn't retry; do the LLM work in the
  // background and reply out-of-band via the REST API.
  res.sendStatus(204);

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
