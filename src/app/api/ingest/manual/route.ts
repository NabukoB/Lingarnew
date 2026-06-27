import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { extractInsights } from "@/lib/ai/extract";
import { generateEmbedding, insightToEmbedText, ghostNoteToEmbedText } from "@/lib/ai/embed";
import { findSimilarInsights } from "@/lib/ai/search";
import { generateGhostNotes } from "@/lib/ai/ghostnotes";
import { assembleDigest } from "@/lib/ai/digest";
import { todaySlug } from "@/lib/utils/date";
import type { Profile, Plan } from "@/types";

export const runtime = "nodejs";

async function fetchUrlText(url: string): Promise<{ text: string; title?: string }> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Lingar/1.0)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);
  const html = await res.text();

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch?.[1]?.trim();

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();

  return { text, title };
}

async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
  const data = await pdfParse(buffer);
  return data.text;
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createSupabaseServiceClient();
  const { data: profileRow } = await service.from("profiles").select("*").eq("id", user.id).single();
  if (!profileRow) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  const profile = profileRow as Profile;

  let bodyText = "";
  let subject = "Manual article";
  let fromName = "Manual entry";
  let fromEmailSlug = "paste";

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const fd = await req.formData();
    const file = fd.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "PDF too large (max 20 MB)" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      bodyText = await parsePdfBuffer(buffer);
    } catch {
      return NextResponse.json({ error: "Could not parse PDF" }, { status: 422 });
    }

    subject = (fd.get("title") as string | null) ?? file.name ?? "PDF upload";
    fromName = (fd.get("source") as string | null) ?? "PDF upload";
    fromEmailSlug = "pdf";
  } else {
    const body = await req.json() as { title?: string; text?: string; source?: string; url?: string };

    if (body.url) {
      try {
        const fetched = await fetchUrlText(body.url);
        bodyText = fetched.text;
        subject = body.title ?? fetched.title ?? "Article";
        fromName = body.source ?? new URL(body.url).hostname;
        fromEmailSlug = "url";
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to fetch URL";
        return NextResponse.json({ error: msg }, { status: 422 });
      }
    } else {
      if (!body.text?.trim()) return NextResponse.json({ error: "No text provided" }, { status: 400 });
      bodyText = body.text;
      subject = body.title ?? "Manual article";
      fromName = body.source ?? "Manual entry";
      fromEmailSlug = "paste";
    }
  }

  if (!bodyText.trim()) return NextResponse.json({ error: "No text could be extracted" }, { status: 400 });

  const fromEmail = `manual-${fromEmailSlug}@lingar.internal`;

  const { data: sourceRow } = await service.from("sources").upsert(
    { user_id: user.id, from_email: fromEmail, from_name: fromName, last_seen_at: new Date().toISOString() },
    { onConflict: "user_id,from_email" }
  ).select("id").single();

  const { data: rawEmail } = await service.from("raw_emails").insert({
    user_id: user.id,
    source_id: sourceRow?.id ?? null,
    from_email: fromEmail,
    from_name: fromName,
    subject,
    body_text: bodyText,
    received_at: new Date().toISOString(),
  }).select("id").single();

  if (!rawEmail) return NextResponse.json({ error: "Failed to store article" }, { status: 500 });

  try {
    const extracted = await extractInsights({
      subject,
      bodyText,
      fromName,
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

    // Rebuild today's digest so the redirect shows the new insights immediately
    try {
      await assembleDigest({ userId: user.id, date: todaySlug(), plan: profile.plan as Plan });
    } catch {
      // Non-fatal: insights are saved even if digest rebuild fails
    }

    return NextResponse.json({ insights: extracted.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await service.from("raw_emails").update({ processing_error: message }).eq("id", rawEmail.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
