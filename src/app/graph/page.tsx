import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NodeCarousel } from "@/components/synthesis/NodeCarousel";
import type { GhostNoteType, SynthesisNode } from "@/types";

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

export default async function GraphPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (profile?.plan === "free") {
    return (
      <div className="pt-8 space-y-4 max-w-md">
        <p className="text-xs text-lingar-ghost uppercase tracking-widest">Knowledge Graph</p>
        <h1 className="text-2xl font-bold">Synthesis Layer</h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          Explore the topics and patterns the Ghost has discovered across your entire reading history.
          Tap any node to see the Ghost&apos;s sharpest observations about that topic.
        </p>
        <p className="text-sm font-medium text-lingar-ink">
          Available on Pro and Executive plans.
        </p>
      </div>
    );
  }

  // Build nodes server-side
  const [insightsRes, ghostNotesRes] = await Promise.all([
    supabase.from("insights").select("id, tags").eq("user_id", user.id),
    supabase
      .from("ghost_notes")
      .select("id, note_type, title, body, confidence_score, created_at, trigger_insight_id, related_insight_ids")
      .eq("user_id", user.id)
      .gte("confidence_score", 0.6)
      .order("confidence_score", { ascending: false }),
  ]);

  const insights = (insightsRes.data ?? []) as { id: string; tags: string[] | null }[];
  const ghostNotes = (ghostNotesRes.data ?? []) as RawGhostNote[];

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

  nodes.sort((a, b) => b.insightCount - a.insightCount);
  const topNodes = nodes.slice(0, 20);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-lingar-ghost mb-1">
          Knowledge Graph
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Topic Nodes</h1>
        <p className="text-[13px] text-lingar-ghost mt-1.5 leading-snug">
          {topNodes.length > 0
            ? `${topNodes.length} topics the Ghost has been tracking. Tap to explore.`
            : "Start forwarding newsletters to build your knowledge graph."}
        </p>
      </div>

      <NodeCarousel nodes={topNodes} />

      {topNodes.length > 0 && (
        <div className="bg-lingar-accent/5 border border-lingar-accent/20 rounded-2xl px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-lingar-accent mb-1">
            How it works
          </p>
          <p className="text-[12px] text-gray-600 leading-relaxed">
            Each node is a topic the Ghost identified across your reading history. Color indicates
            the dominant pattern: blue for emerging trends, amber for tensions, green for opportunities.
          </p>
        </div>
      )}
    </div>
  );
}
