# WhatsApp AI Assistant

A tiny Node.js/TypeScript service that lets a small business auto-reply to
WhatsApp customer messages using Claude as the LLM. One incoming message in →
one AI-generated reply out. Uses **Twilio** for the WhatsApp side.

## How it works

```
Customer  →  Twilio WhatsApp  →  POST /webhook  →  Claude (claude-opus-4-8)
                                                        ↓
Customer  ←  Twilio WhatsApp  ←   send message   ←  reply text
```

- `src/index.ts` — Express server; POSTed webhook, verifies Twilio's HMAC signature (in production), acks fast, then does the LLM work in the background.
- `src/claude.ts` — builds a business-scoped system prompt and calls the Claude Messages API.
- `src/whatsapp.ts` — parses Twilio's form-encoded webhook and sends the reply via the Twilio SDK.

## Setup

1. **Install dependencies**

   ```sh
   cd whatsapp-assistant
   npm install
   ```

2. **Get a Claude API key**

   Create one at <https://console.anthropic.com/>.

3. **Set up Twilio WhatsApp**

   - Sign up at <https://console.twilio.com/> and grab your **Account SID** and **Auth Token**.
   - For quick testing use the **WhatsApp Sandbox** (`whatsapp:+14155238886`) — no approval needed, follow the "join" instructions in the Twilio console.
   - For production, register your own **WhatsApp Business Sender** through Twilio.

4. **Configure environment variables**

   Copy `.env.example` to `.env` and fill it in.
   `BUSINESS_CONTEXT` is the single knob that teaches Claude about your
   business — hours, menu, delivery zones, return policy, etc. Plain prose is
   what the model reads best.

5. **Run locally**

   ```sh
   npm run dev
   ```

   Expose port 3000 to the internet (e.g. `ngrok http 3000`) and paste the
   resulting `https://…/webhook` URL into your Twilio WhatsApp sender's
   "When a message comes in" HTTP POST setting. Leave `PUBLIC_URL` blank for
   local dev so signature checks are skipped; set it to your ngrok/prod URL
   once things work.

6. **Test**

   Send a WhatsApp message to your Twilio sandbox (or business number). The
   service replies in ~1–3 seconds.

## Cost / model notes

Default model is `claude-opus-4-8`. For a high-volume customer-service bot
where cost matters more than nuance, swap it in `src/claude.ts`:

- `claude-sonnet-5` — comparable quality at ~$3/$15 per 1M tokens.
- `claude-haiku-4-5` — fastest and cheapest at $1/$5 per 1M tokens.

Each reply is one request, no conversation history is kept — that keeps input
tokens tiny (mostly just the system prompt and one message). Turn on prompt
caching later if you want to cut the repeated system-prompt cost.

## Deploying

Any Node hosting works. Two easy options:

- **Render / Railway / Fly.io** — connect the repo, set the env vars
  (including `PUBLIC_URL` to your deployed URL), done.
- **Vercel** — you'd want to convert `src/index.ts` into a Next.js API route
  or a Vercel function since Vercel doesn't run a persistent Express server.
