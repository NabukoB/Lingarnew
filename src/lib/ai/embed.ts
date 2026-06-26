import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate a 1536-dim embedding using text-embedding-3-small.
 * Called for each insight and ghost note before storing.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8191),
    encoding_format: "float",
  });

  const embedding = response.data[0]?.embedding;
  if (!embedding) throw new Error("No embedding returned from OpenAI");
  return embedding;
}

/** Canonical text representation for embedding an insight */
export function insightToEmbedText(params: {
  title: string;
  summary: string;
  tags: string[];
}): string {
  return `${params.title}. ${params.summary} Tags: ${params.tags.join(", ")}`;
}

/** Canonical text representation for embedding a ghost note */
export function ghostNoteToEmbedText(params: {
  title: string;
  body: string;
  note_type: string;
}): string {
  return `[${params.note_type}] ${params.title}. ${params.body.slice(0, 1000)}`;
}
