import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { SimilarInsight, SynthesisResult } from "@/types";

export async function findSimilarInsights(params: {
  queryEmbedding: number[];
  userId: string;
  matchThreshold?: number;
  matchCount?: number;
}): Promise<SimilarInsight[]> {
  const {
    queryEmbedding,
    userId,
    matchThreshold = 0.5,
    matchCount = 5,
  } = params;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("match_insights", {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_user_id: userId,
  });

  if (error) throw new Error(`Vector search failed: ${error.message}`);
  return (data ?? []) as SimilarInsight[];
}

export async function findSimilarGhostNotes(params: {
  queryEmbedding: number[];
  userId: string;
  matchThreshold?: number;
  matchCount?: number;
}): Promise<SynthesisResult[]> {
  const {
    queryEmbedding,
    userId,
    matchThreshold = 0.4,
    matchCount = 8,
  } = params;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("match_ghost_notes", {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_user_id: userId,
  });

  if (error) throw new Error(`Ghost note search failed: ${error.message}`);
  return (data ?? []) as SynthesisResult[];
}
