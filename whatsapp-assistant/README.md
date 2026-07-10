# WhatsApp AI Assistant

A tiny Node.js/TypeScript service that lets a small business auto-reply to
WhatsApp customer messages using Claude as the LLM. One incoming message in →
one AI-generated reply out.

## How it works

```
Customer  →  WhatsApp Cloud API  →  POST /webhook  →  Claude (claude-opus-4-8)
                                                          ↓
Customer  ←  WhatsApp Cloud API  ←  send message  ←  reply text
```

- `src/index.ts` — Express server with the WhatsApp webhook (GET verify, POST message).
- `src/claude.ts` — builds a business-scoped system prompt and calls the Claude Messages API.
- `src/whatsapp.ts` — parses the incoming webhook payload and sends the reply via the Graph API.

## Setup

1. **Install dependencies**

   ```sh
   cd whatsapp-assistant
   npm install
   ```

2. **Get a Claude API key**

   Create one at <https://console.anthropic.com/>.

3. **Set up WhatsApp Business Cloud API**

   Follow the Meta getting-started guide: <https://developers.facebook.com/docs/whatsapp/cloud-api/get-started>.
   You'll end up with a **phone number ID** and an **access token** on your WhatsApp Business account.

4. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in the values. `BUSINESS_CONTEXT` is
   the single knob that teaches Claude about your business — hours, menu,
   delivery zones, return policy, etc. Keep it in plain prose; that's what the
   model reads best.

5. **Run locally**

   ```sh
   npm run dev
   ```

   Expose the local port to the internet (e.g. `ngrok http 3000`) and paste
   the resulting `https://…/webhook` URL into Meta's webhook config, using the
   same `WHATSAPP_VERIFY_TOKEN` you set in `.env`. Subscribe to the `messages`
   field.

6. **Test**

   Send a WhatsApp message to your business number. The service replies in
   ~1–3 seconds.

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

- **Render / Railway / Fly.io** — connect the repo, set the env vars, done.
- **Vercel** — you'd want to convert `src/index.ts` into a Next.js API route
  or a Vercel function since Vercel doesn't run a persistent Express server.
