// ============================================================
// DOMAIN TYPES — mirrors Supabase table shapes
// ============================================================

export type Plan = "free" | "pro" | "executive";
export type GhostNoteType = "connection" | "contradiction" | "opportunity";

export interface Profile {
  id: string;
  email: string;
  ingest_email: string;
  display_name: string | null;
  goals: string[];
  interests: string[];
  plan: Plan;
  created_at: string;
  updated_at: string;
}

export interface Source {
  id: string;
  user_id: string;
  from_email: string;
  from_name: string | null;
  send_count: number;
  useful_count: number;
  ignored_count: number;
  unsubscribe_suggested: boolean;
  first_seen_at: string;
  last_seen_at: string;
}

export interface RawEmail {
  id: string;
  user_id: string;
  source_id: string | null;
  mailgun_message_id: string | null;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  received_at: string;
  processed: boolean;
  processing_error: string | null;
}

export interface Insight {
  id: string;
  user_id: string;
  email_id: string;
  source_id: string | null;
  title: string;
  summary: string;
  relevance_score: number;
  why_it_matters: string | null;
  tags: string[];
  created_at: string;
}

export interface GhostNote {
  id: string;
  user_id: string;
  trigger_insight_id: string;
  related_insight_ids: string[];
  note_type: GhostNoteType;
  title: string;
  body: string;
  confidence_score: number;
  included_in_digest: boolean;
  created_at: string;
}

export interface Digest {
  id: string;
  user_id: string;
  date: string;
  slug: string;
  insight_ids: string[];
  ghost_note_ids: string[];
  headline: string | null;
  generated_at: string | null;
}

// ============================================================
// API REQUEST / RESPONSE SHAPES
// ============================================================

export interface GenerateDigestRequest {
  user_id: string;
  date: string; // YYYY-MM-DD
}

export interface DigestPageData {
  digest: Digest;
  insights: Insight[];
  ghostNotes: GhostNote[];
  sources: Source[];
  profile: Pick<Profile, "display_name" | "goals">;
}

export interface SynthesisQueryRequest {
  query: string;
}

export interface SynthesisResult {
  id: string;
  note_type: GhostNoteType;
  title: string;
  body: string;
  confidence_score: number;
  created_at: string;
  similarity: number;
}

export interface SynthesisQueryResponse {
  notes: SynthesisResult[];
  query_id: string;
}

// ============================================================
// AI PIPELINE INTERMEDIATE TYPES
// ============================================================

export interface ExtractedInsight {
  title: string;
  summary: string;
  relevance_score: number;
  why_it_matters: string;
  tags: string[];
}

export interface GhostNoteCandidate {
  note_type: GhostNoteType;
  title: string;
  body: string;
  confidence_score: number;
  related_insight_ids: string[];
}

export interface SimilarInsight {
  id: string;
  title: string;
  summary: string;
  why_it_matters: string | null;
  tags: string[];
  created_at: string;
  similarity: number;
}
