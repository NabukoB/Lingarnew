import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { leadId: string } }
): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: lead, error } = await supabase
    .from("crm_leads")
    .select("*, contact:wa_contacts(*)")
    .eq("id", params.leadId)
    .eq("user_id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ lead });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { leadId: string } }
): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const allowed = ["stage", "notes", "value_estimate", "ai_next_action", "conv_type"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (updates.stage === "closed_won" || updates.stage === "closed_lost") {
    updates.closed_at = new Date().toISOString();
  }

  const { data: lead, error } = await supabase
    .from("crm_leads")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", params.leadId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { leadId: string } }
): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase
    .from("crm_leads")
    .update({ closed_at: new Date().toISOString(), stage: "closed_lost" })
    .eq("id", params.leadId)
    .eq("user_id", user.id);

  return NextResponse.json({ status: "closed" });
}
