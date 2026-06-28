import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DigestPageData } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { date: string } }
): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date } = params;

  const { data: digest } = await supabase
    .from("digests")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", date)
    .single();

  if (!digest) {
    return NextResponse.json({ error: "Digest not found" }, { status: 404 });
  }

  const [insightsRes, ghostNotesRes, sourcesRes, profileRes] = await Promise.all([
    supabase
      .from("insights")
      .select("*")
      .in("id", digest.insight_ids ?? [])
      .order("relevance_score", { ascending: false }),
    supabase
      .from("ghost_notes")
      .select("*")
      .in("id", digest.ghost_note_ids ?? [])
      .order("confidence_score", { ascending: false }),
    supabase.from("sources").select("*").eq("user_id", user.id),
    supabase
      .from("profiles")
      .select("display_name, goals")
      .eq("id", user.id)
      .single(),
  ]);

  const data: DigestPageData = {
    digest,
    insights: insightsRes.data ?? [],
    ghostNotes: ghostNotesRes.data ?? [],
    sources: sourcesRes.data ?? [],
    profile: profileRes.data ?? { display_name: null, goals: [] },
  };

  return NextResponse.json(data);
}
