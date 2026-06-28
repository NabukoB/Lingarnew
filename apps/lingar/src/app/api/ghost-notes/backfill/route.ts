import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { findSimilarInsights } from "@/lib/ai/search";
import { generateGhostNotes } from "@/lib/ai/ghostnotes";
import { generateEmbedding, ghostNoteToEmbedText } from "@/lib/ai/embed";

export const runtime = "nodejs";
// Vercel max: 60s on hobby, 300s on pro
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user_id } = (await req.json()) as { user_id?: string };
  if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

  const service = createSupabaseServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select("goals")
    .eq("id", user_id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Fetch all insights for this user, oldest first so connections flow forward in time
  const { data: insights } = await service
    .from("insights")
    .select("id, title, summary, why_it_matters, tags, embedding, created_at")
    .eq("user_id", user_id)
    .order("created_at", { ascending: true });

  if (!insights?.length) return NextResponse.json({ generated: 0, skipped: 0 });

  // Find which insights already have ghost notes so we don't duplicate
  const { data: existingGhosts } = await service
    .from("ghost_notes")
    .select("trigger_insight_id")
    .eq("user_id", user_id);

  const alreadyProcessed = new Set((existingGhosts ?? []).map((g) => g.trigger_insight_id));

  let generated = 0;
  let skipped = 0;
  const errors: string[] = [];

  type InsightRow = {
    id: string;
    title: string;
    summary: string;
    why_it_matters: string | null;
    tags: string[];
    embedding: number[] | null;
    created_at: string;
  };

  // Process insights that don't yet have ghost notes
  const toProcess = (insights as InsightRow[]).filter((i) => !alreadyProcessed.has(i.id));

  for (const insight of toProcess) {
    try {
      if (!insight.embedding) { skipped++; continue; }

      const similar = await findSimilarInsights({
        queryEmbedding: insight.embedding,
        userId: user_id,
        matchThreshold: 0.5,
        matchCount: 5,
      });

      // Exclude the insight itself from the similar list
      const filtered = similar.filter((s) => s.id !== insight.id);
      if (filtered.length === 0) { skipped++; continue; }

      const ghosts = await generateGhostNotes({
        newInsight: {
          title: insight.title,
          summary: insight.summary,
          why_it_matters: insight.why_it_matters,
          tags: insight.tags ?? [],
        },
        similarInsights: filtered,
        userGoals: profile.goals ?? [],
      });

      for (const g of ghosts) {
        const ge = await generateEmbedding(
          ghostNoteToEmbedText({ title: g.title, body: g.body, note_type: g.note_type })
        );
        await service.from("ghost_notes").insert({
          user_id,
          trigger_insight_id: insight.id,
          related_insight_ids: g.related_insight_ids,
          note_type: g.note_type,
          title: g.title,
          body: g.body,
          confidence_score: g.confidence_score,
          embedding: ge,
        });
        generated++;
      }

      if (ghosts.length === 0) skipped++;
    } catch (err) {
      errors.push(`${insight.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Rebuild digest to include new ghost notes
  const today = new Date().toISOString().slice(0, 10);
  try {
    const digestUrl = new URL("/api/digest/generate", req.url);
    await fetch(digestUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ user_id, date: today }),
    });
  } catch { /* non-fatal */ }

  return NextResponse.json({
    total_insights: insights.length,
    already_had_ghost_notes: alreadyProcessed.size,
    processed: toProcess.length,
    ghost_notes_generated: generated,
    skipped,
    errors: errors.slice(0, 10),
  });
}
