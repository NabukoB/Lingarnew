import OpenAI from "openai";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Insight, GhostNote, Plan } from "@/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const INSIGHT_LIMITS: Record<Plan, number> = {
  free: 3,
  pro: 10,
  executive: 50,
};

const GHOST_NOTE_LIMITS: Record<Plan, number> = {
  free: 5,
  pro: 10,
  executive: 15,
};

export async function assembleDigest(params: {
  userId: string;
  date: string; // YYYY-MM-DD
  plan: Plan;
}): Promise<{ digestId: string }> {
  const { userId, date, plan } = params;
  const supabase = createSupabaseServiceClient();

  const startOfDay = `${date}T00:00:00Z`;
  const endOfDay = `${date}T23:59:59Z`;

  // Fetch today's insights, ordered by relevance
  const { data: insightRows } = await supabase
    .from("insights")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", startOfDay)
    .lte("created_at", endOfDay)
    .order("relevance_score", { ascending: false })
    .limit(INSIGHT_LIMITS[plan]);

  const selectedInsights = (insightRows ?? []) as Insight[];

  // Fetch Ghost Notes: top by confidence across all user's notes.
  // We intentionally do NOT filter by today's insight IDs — ghost notes
  // surface cross-article patterns and may be triggered by any insight,
  // including ones that didn't make the top-N relevance cut today.
  const selectedGhostNotes: GhostNote[] = [];
  const ghostLimit = GHOST_NOTE_LIMITS[plan];

  if (ghostLimit > 0) {
    const { data: ghostRows } = await supabase
      .from("ghost_notes")
      .select("*")
      .eq("user_id", userId)
      .gte("confidence_score", 0.6)
      .order("confidence_score", { ascending: false })
      .limit(ghostLimit);

    selectedGhostNotes.push(...((ghostRows ?? []) as GhostNote[]));
  }

  const headline = await generateHeadline({
    insights: selectedInsights,
    ghostNotes: selectedGhostNotes,
  });

  // Mark selected ghost notes as included
  if (selectedGhostNotes.length > 0) {
    await supabase
      .from("ghost_notes")
      .update({ included_in_digest: true })
      .in(
        "id",
        selectedGhostNotes.map((g) => g.id)
      );
  }

  const { data: digest, error } = await supabase
    .from("digests")
    .upsert(
      {
        user_id: userId,
        date,
        slug: date,
        insight_ids: selectedInsights.map((i) => i.id),
        ghost_note_ids: selectedGhostNotes.map((g) => g.id),
        headline,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" }
    )
    .select("id")
    .single();

  if (error || !digest) {
    throw new Error(`Digest upsert failed: ${error?.message ?? "unknown"}`);
  }

  return { digestId: digest.id };
}

async function generateHeadline(params: {
  insights: Insight[];
  ghostNotes: GhostNote[];
}): Promise<string> {
  if (params.insights.length === 0) return "Nothing new today. The Ghost is watching.";

  const titles = params.insights
    .slice(0, 5)
    .map((i) => i.title)
    .join("; ");
  const ghostCount = params.ghostNotes.length;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Write a single sharp headline (max 15 words) that captures the theme of today's intelligence brief. Sound like an analyst who has been paying attention, not a newsletter editor. No clickbait. No em-dashes. Be direct.",
      },
      {
        role: "user",
        content: `Today's insights: ${titles}. ${ghostCount > 0 ? `The Ghost spotted ${ghostCount} pattern${ghostCount > 1 ? "s" : ""} worth flagging.` : ""}`,
      },
    ],
    max_tokens: 60,
    temperature: 0.5,
  });

  return (
    response.choices[0]?.message?.content?.trim() ?? "Your daily intelligence brief."
  );
}
