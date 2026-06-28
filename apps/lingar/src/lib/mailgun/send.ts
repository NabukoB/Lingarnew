export async function sendDigestEmail(params: {
  to: string;
  toName: string | null;
  headline: string;
  insightCount: number;
  featuredNoteTitle?: string;
  featuredNoteBody?: string;
  digestUrl: string;
}) {
  const { to, toName, headline, insightCount, featuredNoteTitle, featuredNoteBody, digestUrl } = params;
  const domain = process.env.MAILGUN_DOMAIN;
  const apiKey = process.env.MAILGUN_API_KEY;
  if (!domain || !apiKey || domain === "placeholder") return;

  const recipient = toName ? `${toName} <${to}>` : to;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#161618;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#FAFAF8;">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
    <div style="margin-bottom:28px;">
      <span style="font-size:22px;font-weight:800;color:#C9A050;letter-spacing:-0.5px;">L</span>
      <span style="font-size:13px;font-weight:700;color:#C9A050;letter-spacing:3px;margin-left:6px;">LINGAR</span>
      <p style="margin:4px 0 0;font-size:11px;color:#9CA3AF;letter-spacing:1px;">PERSONAL INTELLIGENCE OS</p>
    </div>

    <h1 style="font-size:20px;font-weight:700;color:#FAFAF8;line-height:1.3;margin:0 0 8px;">${headline}</h1>
    <p style="font-size:13px;color:#9CA3AF;margin:0 0 24px;">${insightCount} new insight${insightCount !== 1 ? "s" : ""} in today's brief</p>

    ${featuredNoteTitle ? `
    <div style="background:#222226;border:1px solid rgba(201,160,80,0.35);border-radius:16px;padding:20px;margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div style="width:36px;height:36px;border-radius:50%;background:#1a1a1c;border:1px solid rgba(201,160,80,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;">👻</div>
        <div>
          <p style="margin:0;font-size:16px;font-weight:700;color:#FAFAF8;">Ghost Note</p>
          <p style="margin:0;font-size:11px;color:#C9A050;">Why this matters to you</p>
        </div>
        <span style="margin-left:auto;color:#C9A050;font-size:14px;">✦</span>
      </div>
      <h3 style="margin:0 0 8px;font-size:14px;font-weight:600;color:#FAFAF8;">${featuredNoteTitle}</h3>
      <p style="margin:0;font-size:12px;color:#D1D5DB;line-height:1.6;">${featuredNoteBody?.slice(0, 280)}${(featuredNoteBody?.length ?? 0) > 280 ? "…" : ""}</p>
    </div>
    ` : ""}

    <a href="${digestUrl}" style="display:block;background:#C9A050;color:#0F0F0F;text-align:center;padding:14px 24px;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;margin-bottom:24px;">
      Read your full brief →
    </a>

    <p style="font-size:11px;color:#6B7280;text-align:center;margin:0;">
      The Ghost has been watching. <a href="${digestUrl}" style="color:#C9A050;text-decoration:none;">lingar.app</a>
    </p>
  </div>
</body>
</html>`;

  const text = `LINGAR — ${headline}\n\n${insightCount} new insight${insightCount !== 1 ? "s" : ""} today.\n\n${featuredNoteTitle ? `Ghost Note: ${featuredNoteTitle}\n${featuredNoteBody?.slice(0, 300)}\n\n` : ""}Read your brief: ${digestUrl}`;

  const fd = new FormData();
  fd.append("from", `The Ghost <ghost@${domain}>`);
  fd.append("to", recipient);
  fd.append("subject", `Your brief: ${headline}`);
  fd.append("html", html);
  fd.append("text", text);

  const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
    },
    body: fd,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.status.toString());
    throw new Error(`Mailgun send failed: ${err}`);
  }
}
