import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: leads, error } = await supabase
    .from("crm_leads")
    .select(
      `*, contact:wa_contacts(*),
       message_count:wa_messages(count),
       last_message:wa_messages(received_at)`
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flatten aggregates
  const enriched = (leads ?? []).map((l) => ({
    ...l,
    message_count: (l.message_count as unknown as { count: number }[])?.[0]?.count ?? 0,
    last_message_at:
      (l.last_message as unknown as { received_at: string }[])?.[0]?.received_at ?? null,
    last_message: undefined,
  }));

  return NextResponse.json({ leads: enriched });
}
