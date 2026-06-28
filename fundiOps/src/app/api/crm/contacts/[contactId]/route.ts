import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { contactId: string } }
): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [contactRes, messagesRes, leadRes, followUpsRes] = await Promise.all([
    supabase
      .from("wa_contacts")
      .select("*")
      .eq("id", params.contactId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("wa_messages")
      .select("*")
      .eq("contact_id", params.contactId)
      .eq("user_id", user.id)
      .order("received_at", { ascending: true })
      .limit(200),
    supabase
      .from("crm_leads")
      .select("*")
      .eq("contact_id", params.contactId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("crm_follow_ups")
      .select("*")
      .eq("contact_id", params.contactId)
      .eq("user_id", user.id)
      .order("due_at", { ascending: true }),
  ]);

  if (contactRes.error)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    contact: {
      ...contactRes.data,
      lead: leadRes.data ?? null,
      messages: messagesRes.data ?? [],
      follow_ups: followUpsRes.data ?? [],
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { contactId: string } }
): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const allowed = [
    "display_name",
    "business_name",
    "email",
    "interest_summary",
    "urgency",
    "tags",
    "auto_reply",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { data: contact, error } = await supabase
    .from("wa_contacts")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", params.contactId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contact });
}
