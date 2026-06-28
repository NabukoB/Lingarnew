import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { generateIngestEmail } from "@/lib/utils/ingest-email";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { displayName, goals, interests } = body;

  const ingestEmail = generateIngestEmail(user.id);

  const service = createSupabaseServiceClient();
  const { error } = await service.from("profiles").upsert({
    id: user.id,
    email: user.email ?? "",
    ingest_email: ingestEmail,
    display_name: displayName?.trim() || null,
    goals: goals ?? [],
    interests: interests ?? [],
    plan: "pro",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ingestEmail });
}
