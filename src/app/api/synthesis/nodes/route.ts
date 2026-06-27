import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { GhostNoteType, SynthesisNodesResponse, SynthesisNode } from "@/types";

export const runtime = "nodejs";

interface RawGhostNote {
  id: string;
  note_type: string;
  title: string;
  body: string;
  confidence_score: number;
  created_at: string;
  trigger_insight_id: string;
  related_insight_ids: string[] | null;
}

export async function GET(): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [insightsRes, ghostNotesRes] = await Promise.all([
    supabase
      .from("insights")
      .select("id, tags")
      .eq("user_id", user.id),
    supabase
      .from("ghost_notes")
      .select("id, note_type, title, body, confidence_score, created_at, trigger_insight_id, related_insight_ids")
      .eq("user_id", user.id)
      .gte("confidence_score", 0.6)
      .order("confidence_score", { ascending: false }),
  ]);

  const insights = (insightsRes.data ?? []) as { id: string; tags: string[] | null }[];
  const ghostNotes = (ghostNotesRes.data ?? []) as RawGhostNote[];

  // Group insight IDs by tag
  const tagToInsightIds = new Map<string, Set<string>>();
  for (const insight of insights) {
    for (const tag of insight.tags ?? []) {
      if (!tagToInsightIds.has(tag)) tagToInsightIds.set(tag, new Set());
      tagToInsightIds.get(tag)!.add(insight.id);
    }
  }

  const nodes: SynthesisNode[] = [];

  for (const [tag, insightIds] of tagToInsightIds) {
    const relatedNotes = ghostNotes.filter((note: RawGhostNote) => {
      if (insightIds.has(note.trigger_insight_id)) return true;
      return (note.related_insight_ids ?? []).some((id) => insightIds.has(id));
    });

    // Tally dominant ghost note type
    const typeCounts: Record<GhostNoteType, number> = {
      connection: 0,
      contradiction: 0,
      opportunity: 0,
    };
    for (const note of relatedNotes) {
      typeCounts[note.note_type as GhostNoteType]++;
    }
    const sorted = (Object.entries(typeCounts) as [GhostNoteType, number][]).sort(
      (a, b) => b[1] - a[1]
    );
    const top = sorted[0];
    const dominantType: GhostNoteType | null =
      top !== undefined && top[1] > 0 ? top[0] : null;

    nodes.push({
      tag,
      insightCount: insightIds.size,
      dominantType,
      topGhostNotes: relatedNotes.slice(0, 3).map((n: RawGhostNote) => ({
        id: n.id,
        note_type: n.note_type as GhostNoteType,
        title: n.title,
        body: n.body,
        confidence_score: n.confidence_score,
        created_at: n.created_at,
      })),
    });
  }

  // Sort by insight count, return top 20
  nodes.sort((a, b) => b.insightCount - a.insightCount);

  const response: SynthesisNodesResponse = { nodes: nodes.slice(0, 20) };
  return NextResponse.json(response);
}
