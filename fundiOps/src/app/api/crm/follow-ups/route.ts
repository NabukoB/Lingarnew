import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "pending";

  const { data: followUps, error } = await supabase
    .from("crm_follow_ups")
    .select("*, contact:wa_contacts(display_name, phone, business_name)")
    .eq("user_id", user.id)
    .eq("status", status)
    .order("due_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ follow_ups: followUps ?? [] });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contact_id, lead_id, note, due_at } = await req.json();
  if (!contact_id || !note || !due_at) {
    return NextResponse.json({ error: "contact_id, note, due_at required" }, { status: 400 });
  }

  const { data: followUp, error } = await supabase
    .from("crm_follow_ups")
    .insert({
      user_id: user.id,
      contact_id,
      lead_id: lead_id ?? null,
      note,
      due_at,
      status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ follow_up: followUp });
}
