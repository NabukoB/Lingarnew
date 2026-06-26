import OpenAI from "openai";
import type { ExtractedInsight } from "@/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Strip HTML tags and decode common entities */
export function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Truncate to stay within the model's token budget */
export function truncateBody(text: string, maxChars = 12000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n[truncated]";
}

export interface ExtractInsightsParams {
  subject: string;
  bodyText: string;
  fromName: string;
  userGoals: string[];
  userInterests: string[];
}

export async function extractInsights(
  params: ExtractInsightsParams
): Promise<ExtractedInsight[]> {
  const { subject, bodyText, fromName, userGoals, userInterests } = params;

  const systemPrompt = `You are a ruthlessly selective intelligence analyst. Your job is to extract signal from noise.

The reader's goals: ${userGoals.join("; ")}
The reader's interests: ${userInterests.join("; ")}

Extract 1–5 distinct insights from the newsletter below. Ruthlessly discard:
- Generic advice that applies to everyone
- Promotional content and product announcements
- Content unrelated to the reader's goals or interests
- Fluff that sounds interesting but has no actionable angle

For each insight you keep:
1. title: Sharp, specific, 10 words max. No vague language.
2. summary: 2–4 sentences. State the finding directly. No "the author argues that."
3. relevance_score: 0.0–1.0 against the reader's specific goals. Be strict. 1.0 = directly actionable today.
4. why_it_matters: 1–2 sentences. Reference their actual goals by name. No generic motivational language.
5. tags: 2–5 short lowercase tags.

Minimum bar: relevance_score >= 0.3. Below that, don't include it.

Respond ONLY with valid JSON:
{"insights": [{"title": "...", "summary": "...", "relevance_score": 0.0, "why_it_matters": "...", "tags": ["..."]}]}`;

  const userMessage = `From: ${fromName}\nSubject: ${subject}\n\n${truncateBody(bodyText)}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 2048,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { insights?: ExtractedInsight[] };
  return parsed.insights ?? [];
}
