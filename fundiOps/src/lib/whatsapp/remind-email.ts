import { format } from "date-fns";

export async function sendFollowUpReminderEmail({
  to,
  contactName,
  note,
  dueAt,
  contactUrl,
}: {
  to: string;
  contactName: string;
  note: string;
  dueAt: string;
  contactUrl: string;
}) {
  const domain = process.env.MAILGUN_DOMAIN;
  const apiKey = process.env.MAILGUN_API_KEY;
  const from = process.env.MAILGUN_FROM ?? `fundiOps <noreply@${domain}>`;
  if (!domain || !apiKey) return;

  const dueLabel = format(new Date(dueAt), "PPp");
  const html = `
    <p>Hi,</p>
    <p>You have a follow-up due for <strong>${contactName}</strong>:</p>
    <blockquote style="border-left:3px solid #25d366;padding-left:12px;color:#374151">${note}</blockquote>
    <p>Due: ${dueLabel}</p>
    <p><a href="${contactUrl}" style="color:#25d366">View conversation →</a></p>
    <p style="color:#9ca3af;font-size:12px">fundiOps CRM</p>
  `;

  const body = new URLSearchParams({
    from,
    to,
    subject: `Follow-up: ${contactName}`,
    html,
    text: `Follow-up for ${contactName}\n\n${note}\n\nDue: ${dueLabel}\n\n${contactUrl}`,
  });

  await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
}
