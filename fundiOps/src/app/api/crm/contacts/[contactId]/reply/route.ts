import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: { contactId: string } }
): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { body: messageBody } = await req.json();
  if (!messageBody?.trim()) {
    return NextResponse.json({ error: "Message body required" }, { status: 400 });
  }

  const { data: contact, error: contactError } = await supabase
    .from("wa_contacts")
    .select("wa_id")
    .eq("id", params.contactId)
    .eq("user_id", user.id)
    .single();

  if (contactError || !contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  let waMessageId: string;
  try {
    waMessageId = await sendWhatsAppMessage({
      to: contact.wa_id,
      body: messageBody.trim(),
    });
  } catch (err) {
    console.error("WhatsApp send error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send WhatsApp message" },
      { status: 502 }
    );
  }

  const { data: msg, error: msgError } = await supabase
    .from("wa_messages")
    .insert({
      user_id: user.id,
      contact_id: params.contactId,
      wa_message_id: waMessageId,
      direction: "outbound",
      body: messageBody.trim(),
      is_ai_generated: false,
      processed: true,
    })
    .select()
    .single();

  if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 });
  return NextResponse.json({ message: msg });
}
