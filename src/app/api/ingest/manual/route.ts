import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { extractInsights } from "@/lib/ai/extract";
import { generateEmbedding, insightToEmbedText, ghostNoteToEmbedText } from "@/lib/ai/embed";
import { findSimilarInsights } from "@/lib/ai/search";
import { generateGhostNotes } from "@/lib/ai/ghostnotes";
import type { Profile } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, text, source } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "No text provided" }, { status: 400 });

  const service = createSupabaseServiceClient();

  const { data: profileRow } = await service.from("profiles").select("*").eq("id", user.id).single();
  if (!profileRow) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  const profile = profileRow as Profile;

  // Upsert source
  const fromEmail = `manual@${source?.toLowerCase().replace(/\s+/g, "-") ?? "paste"}`;
  const { data: sourceRow } = await service.from("sources").upsert(
    { user_id: user.id, from_email: fromEmail, from_name: source ?? "Manual entry", last_seen_at: new Date().toISOString() },
    { onConflict: "user_id,from_email" }
  ).select("id").single();

  // Store raw email
  const { data: rawEmail } = await service.from("raw_emails").insert({
    user_id: user.id,
    source_id: sourceRow?.id ?? null,
    from_email: fromEmail,
    from_name: source ?? "Manual entry",
    subject: title ?? "Manual article",
    body_text: text,
    received_at: new Date().toISOString(),
  }).select("id").single();

  if (!rawEmail) return NextResponse.json({ error: "Failed to store article" }, { status: 500 });

  try {
    const extracted = await extractInsights({
      subject: title ?? "Manual article",
      bodyText: text,
      fromName: source ?? "Manual entry",
      userGoals: profile.goals,
      userInterests: profile.interests,
    });

    if (extracted.length === 0) {
      await service.from("raw_emails").update({ processed: true }).eq("id", rawEmail.id);
      return NextResponse.json({ insights: 0, message: "No relevant insights found in this article." });
    }

    for (const insight of extracted) {
      const embedding = await generateEmbedding(insightToEmbedText(insight));
      const { data: stored } = await service.from("insights").insert({
        user_id: user.id,
        email_id: rawEmail.id,
        source_id: sourceRow?.id ?? null,
        title: insight.title,
        summary: insight.summary,
        relevance_score: insight.relevance_score,
        why_it_matters: insight.why_it_matters,
        tags: insight.tags,
        embedding,
      }).select("id").single();

      if (!stored) continue;

      if (profile.plan !== "free") {
        const similar = await findSimilarInsights({ queryEmbedding: embedding, userId: user.id, matchThreshold: 0.5, matchCount: 5 });
        if (similar.length > 0) {
          const ghosts = await generateGhostNotes({ newInsight: insight, similarInsights: similar, userGoals: profile.goals });
          for (const g of ghosts) {
            const ge = await generateEmbedding(ghostNoteToEmbedText({ title: g.title, body: g.body, note_type: g.note_type }));
            await service.from("ghost_notes").insert({ user_id: user.id, trigger_insight_id: stored.id, related_insight_ids: g.related_insight_ids, note_type: g.note_type, title: g.title, body: g.body, confidence_score: g.confidence_score, embedding: ge });
          }
        }
      }
    }

    await service.from("raw_emails").update({ processed: true }).eq("id", rawEmail.id);
    return NextResponse.json({ insights: extracted.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await service.from("raw_emails").update({ processing_error: message }).eq("id", rawEmail.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
