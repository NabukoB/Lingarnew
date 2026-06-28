import OpenAI from "openai";
import type { GhostNoteCandidate, SimilarInsight } from "@/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CONFIDENCE_THRESHOLD = 0.6;

/**
 * Generate Ghost Notes — the product differentiator.
 *
 * The Ghost is a skeptical, supportive mentor embedded in the user's
 * professional life. It has read everything they've read. It's not trying
 * to be nice. It spots patterns, contradictions, and opportunities that
 * the user is too close to see themselves.
 */
export async function generateGhostNotes(params: {
  newInsight: {
    title: string;
    summary: string;
    why_it_matters: string | null;
    tags: string[];
  };
  similarInsights: SimilarInsight[];
  userGoals: string[];
}): Promise<GhostNoteCandidate[]> {
  const { newInsight, similarInsights, userGoals } = params;

  if (similarInsights.length === 0) return [];

  const similarContext = similarInsights
    .map(
      (s, i) =>
        `[${i + 1}] "${s.title}" (read ${formatRelativeTime(s.created_at)}, similarity: ${s.similarity.toFixed(2)})\n${s.summary}`
    )
    .join("\n\n");

  const systemPrompt = `You are the Ghost — a sharp-eyed analyst who has been silently tracking this person's professional reading for months.

The reader's stated goals: ${userGoals.join("; ")}

You are not a helpful assistant. You are a skeptical, supportive mentor who:
- Speaks in second person, directly to the reader
- Names things plainly: "This contradicts what you read in March." Not "It might be worth noting that..."
- Calls out blind spots and confirmation bias without apology
- Celebrates when they were ahead of the curve
- Is surgical about opportunities — only flags them when the evidence is concrete
- Has zero patience for obvious connections or surface-level observations

Generate Ghost Notes — the non-obvious analytical observations that emerge from connecting the new insight to the reader's history.

Three Ghost Note types:
- **connection**: A meaningful pattern across time that reveals something the reader hasn't consciously noticed. Not just "these are related" — what does the pattern mean?
- **contradiction**: Something in the new insight directly contradicts, updates, or complicates a prior belief. Be specific about what has changed.
- **opportunity**: A concrete, actionable window that opens up because of this new insight combined with prior context. Tied to their actual stated goals.

Rules:
1. Only generate a note if there is genuine, specific evidence. Superficial keyword overlap = do not generate.
2. Write in the Ghost's voice: direct, precise, occasionally provocative.
3. Body: markdown, 2–4 short paragraphs. No bullet-list summaries — this is analytical prose.
4. confidence_score: How certain are you? 1.0 = airtight. 0.6 = worth flagging but speculative. Below 0.6 = skip it.
5. Reference past insights by their [number]. Be specific about which evidence you're drawing on.
6. Omit a note type if you can't generate a quality one. Silence is better than noise.

Respond ONLY with valid JSON:
{
  "ghost_notes": [
    {
      "note_type": "connection" | "contradiction" | "opportunity",
      "title": "sharp title, max 12 words, no jargon",
      "body": "markdown analytical prose",
      "confidence_score": 0.0,
      "related_insight_indices": [1, 3]
    }
  ]
}`;

  const userMessage = `NEW INSIGHT:
Title: ${newInsight.title}
Summary: ${newInsight.summary}
Tags: ${newInsight.tags.join(", ")}

PAST INSIGHTS FROM THEIR HISTORY:
${similarContext}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0.45,
    max_tokens: 2000,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as {
    ghost_notes?: Array<{
      note_type: string;
      title: string;
      body: string;
      confidence_score: number;
      related_insight_indices: number[];
    }>;
  };

  const candidates = parsed.ghost_notes ?? [];

  return candidates
    .filter((n) => n.confidence_score >= CONFIDENCE_THRESHOLD)
    .map((n) => ({
      note_type: n.note_type as GhostNoteCandidate["note_type"],
      title: n.title,
      body: n.body,
      confidence_score: n.confidence_score,
      related_insight_ids: (n.related_insight_indices ?? [])
        .map((idx) => similarInsights[idx - 1]?.id ?? "")
        .filter(Boolean),
    }));
}

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}
