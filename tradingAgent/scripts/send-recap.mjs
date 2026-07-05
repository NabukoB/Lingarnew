#!/usr/bin/env node
// Standalone Mailgun sender for the trading agent's recap emails.
// Mirrors the HTTP pattern in src/lib/mailgun/send.ts but has no Next.js dependency.
// Usage: node tradingAgent/scripts/send-recap.mjs --subject "..." --file <path-to-markdown> [--text "..."]
//
// A missing/placeholder Mailgun config or a Mailgun error is non-fatal (exit 0/1
// respectively) so a broken email setup never blocks the calling routine's git push.

import { readFileSync } from "node:fs";

function parseArgs(argv) {
  const flags = {};
  for (const arg of argv) {
    if (arg.startsWith("--")) {
      const [key, ...rest] = arg.slice(2).split("=");
      flags[key] = rest.length ? rest.join("=") : "true";
    }
  }
  return flags;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const domain = process.env.MAILGUN_DOMAIN;
  const apiKey = process.env.MAILGUN_API_KEY;
  const to = process.env.RECAP_EMAIL_TO;
  const toName = process.env.RECAP_EMAIL_TO_NAME;
  const from = process.env.MAILGUN_FROM || `trading-agent@${domain}`;

  if (!domain || !apiKey || !to || domain === "placeholder" || apiKey === "placeholder") {
    process.stderr.write("send-recap: MAILGUN_DOMAIN/MAILGUN_API_KEY/RECAP_EMAIL_TO not configured, skipping email\n");
    process.exit(0);
  }

  const subject = flags.subject || "Trading Agent Recap";
  let text = flags.text || "";
  if (flags.file) {
    text = readFileSync(flags.file, "utf8");
  }
  if (!text) {
    process.stderr.write("send-recap: nothing to send, pass --file <path> or --text \"...\"\n");
    process.exit(0);
  }

  const html = `<pre style="font-family:ui-monospace,Menlo,monospace;white-space:pre-wrap;font-size:13px;line-height:1.5;">${escapeHtml(text)}</pre>`;
  const recipient = toName ? `${toName} <${to}>` : to;

  const fd = new FormData();
  fd.append("from", from);
  fd.append("to", recipient);
  fd.append("subject", subject);
  fd.append("text", text);
  fd.append("html", html);

  const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
    },
    body: fd,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.status.toString());
    process.stderr.write(`send-recap: Mailgun send failed: ${err}\n`);
    process.exit(1);
  }

  process.stdout.write(`send-recap: sent "${subject}" to ${to}\n`);
}

main();
