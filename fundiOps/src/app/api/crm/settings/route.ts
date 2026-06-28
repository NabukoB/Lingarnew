import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("crm_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return defaults if no settings row exists yet
  const settings = data ?? {
    user_id: user.id,
    auto_reply_global: false,
    greeting_template: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if ("auto_reply_global" in body) updates.auto_reply_global = body.auto_reply_global;
  if ("greeting_template" in body) updates.greeting_template = body.greeting_template;

  const { data: settings, error } = await supabase
    .from("crm_settings")
    .upsert(
      { user_id: user.id, ...updates, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings });
}
