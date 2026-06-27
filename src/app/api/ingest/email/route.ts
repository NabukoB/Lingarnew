import { NextRequest, NextResponse } from "next/server";
import { verifyMailgunWebhook } from "@/lib/mailgun/verify";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { extractInsights, stripHtml } from "@/lib/ai/extract";
import {
  generateEmbedding,
  insightToEmbedText,
  ghostNoteToEmbedText,
} from "@/lib/ai/embed";
import { findSimilarInsights } from "@/lib/ai/search";
import { generateGhostNotes } from "@/lib/ai/ghostnotes";
import type { Profile } from "@/types";

export const runtime = "nodejs";

// TODO (production): Replace the synchronous AI pipeline below with an
// async job queue (Inngest or Upstash QStash). Store the raw email, return
// 200 immediately, and process in the background. The `processed: false`
// flag on raw_emails serves as a dead-letter queue for failed jobs.

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Parse multipart form data from Mailgun
  const formData = await req.formData();
  const timestamp = formData.get("timestamp") as string | null;
  const token = formData.get("token") as string | null;
  const signature = formData.get("signature") as string | null;

  // 2. Verify Mailgun HMAC signature (skip in test mode)
  const testMode = formData.get("test_mode") === process.env.CRON_SECRET;
  if (!testMode) {
    if (!timestamp || !token || !signature) {
      return NextResponse.json({ error: "Missing signature fields" }, { status: 400 });
    }
    try {
      if (!verifyMailgunWebhook({ timestamp, token, signature })) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: "Signature check failed" }, { status: 401 });
    }
  }

  const supabase = createSupabaseServiceClient();

  const recipient = ((formData.get("recipient") as string) ?? "").toLowerCase();
  const sender = ((formData.get("sender") as string) ?? "").toLowerCase();
  const fromHeader = (formData.get("from") as string) ?? sender;
  const subject = (formData.get("subject") as string) ?? "";
  const bodyText = (formData.get("body-plain") as string) ?? "";
  const bodyHtml = (formData.get("body-html") as string) ?? "";
  const messageId = (formData.get("Message-Id") as string) ?? "";

  // 3. Look up profile by ingest_email
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("ingest_email", recipient)
    .single();

  if (!profile) {
    // Unknown recipient — return 200 so Mailgun doesn't retry
    return NextResponse.json({ status: "unknown_recipient" });
  }

  const typedProfile = profile as Profile;

  // Extract sender display name from "Name <email>" format
  const fromNameMatch = /^([^<]+)</.exec(fromHeader);
  const fromName = fromNameMatch?.[1]?.trim() ?? sender;

  // 4. Upsert source record
  const { data: source } = await supabase
    .from("sources")
    .upsert(
      {
        user_id: typedProfile.id,
        from_email: sender,
        from_name: fromName,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,from_email" }
    )
    .select("id")
    .single();

  if (source?.id) {
    await supabase.rpc("increment_source_send_count", {
      p_source_id: source.id,
    });
  }

  // 5. Store raw email
  const cleanText = bodyText || stripHtml(bodyHtml);
  const { data: rawEmail, error: emailError } = await supabase
    .from("raw_emails")
    .insert({
      user_id: typedProfile.id,
      source_id: source?.id ?? null,
      mailgun_message_id: messageId,
      from_email: sender,
      from_name: fromName,
      subject,
      body_text: cleanText,
      body_html: bodyHtml.slice(0, 50000),
      received_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (emailError || !rawEmail) {
    console.error("[ingest/email] Failed to store raw email:", emailError?.message);
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }

  // ===== AI PIPELINE =====
  try {
    // 6. Extract structured insights
    const extracted = await extractInsights({
      subject,
      bodyText: cleanText,
      fromName,
      userGoals: typedProfile.goals,
      userInterests: typedProfile.interests,
    });

    if (extracted.length === 0) {
      await supabase
        .from("raw_emails")
        .update({ processed: true })
        .eq("id", rawEmail.id);

      if (source?.id) {
        await supabase.rpc("increment_source_ignored_count", {
          p_source_id: source.id,
        });
      }

      return NextResponse.json({ status: "no_insights" });
    }

    // 7. For each insight: embed → store → search → generate ghost notes
    for (const insight of extracted) {
      const embedText = insightToEmbedText(insight);
      const embedding = await generateEmbedding(embedText);

      const { data: storedInsight } = await supabase
        .from("insights")
        .insert({
          user_id: typedProfile.id,
          email_id: rawEmail.id,
          source_id: source?.id ?? null,
          title: insight.title,
          summary: insight.summary,
          relevance_score: insight.relevance_score,
          why_it_matters: insight.why_it_matters,
          tags: insight.tags,
          embedding,
        })
        .select("id")
        .single();

      if (!storedInsight) continue;

      if (source?.id) {
        await supabase.rpc("increment_source_useful_count", {
          p_source_id: source.id,
        });
      }

      // 8. Vector search for related past insights
      const similarInsights = await findSimilarInsights({
        queryEmbedding: embedding,
        userId: typedProfile.id,
        matchThreshold: 0.5,
        matchCount: 5,
      });

      // 9. Generate Ghost Notes (Pro/Executive plans only)
      if (similarInsights.length > 0 && typedProfile.plan !== "free") {
        const ghostCandidates = await generateGhostNotes({
          newInsight: {
            title: insight.title,
            summary: insight.summary,
            why_it_matters: insight.why_it_matters,
            tags: insight.tags,
          },
          similarInsights,
          userGoals: typedProfile.goals,
        });

        for (const candidate of ghostCandidates) {
          const ghostEmbedText = ghostNoteToEmbedText({
            title: candidate.title,
            body: candidate.body,
            note_type: candidate.note_type,
          });
          const ghostEmbedding = await generateEmbedding(ghostEmbedText);

          await supabase.from("ghost_notes").insert({
            user_id: typedProfile.id,
            trigger_insight_id: storedInsight.id,
            related_insight_ids: candidate.related_insight_ids,
            note_type: candidate.note_type,
            title: candidate.title,
            body: candidate.body,
            confidence_score: candidate.confidence_score,
            embedding: ghostEmbedding,
          });
        }
      }
    }

    await supabase
      .from("raw_emails")
      .update({ processed: true })
      .eq("id", rawEmail.id);

    // Run unsubscribe suggestion check on this user's sources
    await supabase.rpc("update_unsubscribe_suggestions");

    return NextResponse.json({ status: "processed", insights: extracted.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await supabase
      .from("raw_emails")
      .update({ processing_error: message })
      .eq("id", rawEmail.id);

    console.error("[ingest/email] Pipeline error:", message);
    // Return 200 — the raw email is stored; do not let Mailgun retry
    return NextResponse.json({ status: "pipeline_error", error: message });
  }
}
