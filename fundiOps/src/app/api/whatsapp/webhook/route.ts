import { NextRequest, NextResponse } from "next/server";
import { verifyWhatsAppSignature } from "@/lib/whatsapp/verify";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";
import { runCrmAgent } from "@/lib/ai/crm-agent";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { WhatsAppWebhookPayload } from "@/lib/whatsapp/types";

export const runtime = "nodejs";

// GET — Meta webhook verification handshake
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST — Inbound message events
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Phase 1: read raw body and verify Meta signature
  const rawBody = Buffer.from(await req.arrayBuffer());
  const signature = req.headers.get("x-hub-signature-256");

  if (process.env.WHATSAPP_APP_SECRET) {
    if (!verifyWhatsAppSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    console.warn("WHATSAPP_APP_SECRET not set — signature verification skipped");
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString()) as WhatsAppWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // Only handle whatsapp_business_account events
  if (payload.object !== "whatsapp_business_account") {
    return NextResponse.json({ status: "ignored" });
  }

  const supabase = createSupabaseServiceClient();

  // Resolve owner: prefer env var, fall back to first profile in DB
  let ownerId = process.env.WHATSAPP_OWNER_USER_ID;
  if (!ownerId) {
    const { data: firstProfile } = await supabase
      .from("profiles")
      .select("id")
      .limit(1)
      .single();
    ownerId = firstProfile?.id ?? null;
  }
  if (!ownerId) {
    console.error("No owner profile found — run the setup check at /api/setup/check");
    return NextResponse.json({ status: "misconfigured" });
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;

      // Phone number filter removed — signature verification is sufficient

      // Only process message events (not status updates)
      if (!value.messages?.length) continue;

      for (const msg of value.messages) {
        // Only handle text messages for now; log media types but skip
        const messageText =
          msg.type === "text" && msg.text?.body ? msg.text.body : null;
        if (!messageText) continue;

        const from = msg.from;
        const waMessageId = msg.id;
        const contactName =
          value.contacts?.find((c) => c.wa_id === from)?.profile.name ?? null;

        // Phase 2: Deduplicate — skip if we've seen this message ID before
        const { data: existing } = await supabase
          .from("wa_messages")
          .select("id")
          .eq("wa_message_id", waMessageId)
          .maybeSingle();

        if (existing) continue;

        // Phase 3: Upsert contact
        const { data: contact, error: contactError } = await supabase
          .from("wa_contacts")
          .upsert(
            {
              user_id: ownerId,
              wa_id: from,
              phone: from,
              display_name: contactName,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,wa_id" }
          )
          .select("id, auto_reply, display_name, business_name, interest_summary")
          .single();

        if (contactError || !contact) {
          console.error("Contact upsert error:", contactError);
          continue;
        }

        // Store raw inbound message
        const { data: storedMsg, error: msgError } = await supabase
          .from("wa_messages")
          .insert({
            user_id: ownerId,
            contact_id: contact.id,
            wa_message_id: waMessageId,
            direction: "inbound",
            body: messageText,
            media_type: "text",
            processed: false,
          })
          .select("id")
          .single();

        if (msgError || !storedMsg) {
          console.error("Message insert error:", msgError);
          continue;
        }

        // Phase 4: AI pipeline (wrapped — always return 200 to Meta)
        try {
          // Fetch conversation history for context
          const { data: history } = await supabase
            .from("wa_messages")
            .select("direction, body, received_at")
            .eq("contact_id", contact.id)
            .order("received_at", { ascending: false })
            .limit(20);

          // Fetch existing lead
          const { data: existingLead } = await supabase
            .from("crm_leads")
            .select("id, stage, conv_type")
            .eq("contact_id", contact.id)
            .maybeSingle();

          const analysis = await runCrmAgent({
            messages: (history ?? []).reverse(),
            existingContact: {
              display_name: contact.display_name,
              business_name: contact.business_name,
              interest_summary: contact.interest_summary,
              current_stage: existingLead?.stage ?? "new",
            },
          });

          // Upsert CRM lead
          const { data: lead } = await supabase
            .from("crm_leads")
            .upsert(
              {
                user_id: ownerId,
                contact_id: contact.id,
                stage: analysis.lead_stage,
                conv_type: analysis.conv_type,
                ai_summary: analysis.ai_summary,
                ai_next_action: analysis.ai_next_action,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id,contact_id" }
            )
            .select("id")
            .single();

          // Update contact with AI-extracted fields
          const { error: contactUpdateError } = await supabase
            .from("wa_contacts")
            .update({
              display_name: analysis.contact_name ?? contact.display_name,
              business_name: analysis.business_name,
              email: analysis.email,
              interest_summary: analysis.interest_summary,
              urgency: analysis.urgency,
              tags: analysis.tags,
              updated_at: new Date().toISOString(),
            })
            .eq("id", contact.id);
          if (contactUpdateError) {
            console.error("Contact update error:", contactUpdateError);
          }

          // Schedule follow-up if AI recommends one
          if (analysis.follow_up_hours > 0 && analysis.follow_up_note) {
            const dueAt = new Date(
              Date.now() + analysis.follow_up_hours * 3_600_000
            ).toISOString();
            await supabase.from("crm_follow_ups").insert({
              user_id: ownerId,
              contact_id: contact.id,
              lead_id: lead?.id ?? null,
              message_id: storedMsg.id,
              due_at: dueAt,
              note: analysis.follow_up_note,
              status: "pending",
            });
          }

          // Fetch CRM settings for auto-reply check
          const { data: settings } = await supabase
            .from("crm_settings")
            .select("auto_reply_global")
            .eq("user_id", ownerId)
            .maybeSingle();

          const shouldAutoReply =
            (settings?.auto_reply_global || contact.auto_reply) &&
            analysis.auto_reply_message &&
            analysis.conv_type !== "spam";

          if (shouldAutoReply && analysis.auto_reply_message) {
            const outboundId = await sendWhatsAppMessage({
              to: from,
              body: analysis.auto_reply_message,
            });
            await supabase.from("wa_messages").insert({
              user_id: ownerId,
              contact_id: contact.id,
              wa_message_id: outboundId,
              direction: "outbound",
              body: analysis.auto_reply_message,
              is_ai_generated: true,
              processed: true,
            });
          }

          // Mark message as processed
          await supabase
            .from("wa_messages")
            .update({ processed: true })
            .eq("id", storedMsg.id);
        } catch (err) {
          console.error("AI pipeline error:", err);
          await supabase
            .from("wa_messages")
            .update({
              processing_error:
                err instanceof Error ? err.message : String(err),
            })
            .eq("id", storedMsg.id);
        }
      }
    }
  }

  // Always return 200 — non-200 causes Meta to retry
  return NextResponse.json({ status: "ok" });
}
