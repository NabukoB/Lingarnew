import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/ai/embed";
import { findSimilarGhostNotes } from "@/lib/ai/search";
import type { SynthesisQueryRequest, SynthesisQueryResponse } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Partial<SynthesisQueryRequest>;
  if (!body.query?.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const embedding = await generateEmbedding(body.query);
  const notes = await findSimilarGhostNotes({
    queryEmbedding: embedding,
    userId: user.id,
    matchThreshold: 0.4,
    matchCount: 8,
  });

  const { data: queryLog } = await supabase
    .from("synthesis_queries")
    .insert({
      user_id: user.id,
      query_text: body.query,
      result_note_ids: notes.map((n) => n.id),
    })
    .select("id")
    .single();

  const response: SynthesisQueryResponse = {
    notes,
    query_id: queryLog?.id ?? "",
  };

  return NextResponse.json(response);
}
