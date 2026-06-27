import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InsightItem } from "@/components/digest/InsightItem";
import { GhostNote } from "@/components/digest/GhostNote";
import { SourceHealth } from "@/components/sources/SourceHealth";
import { formatDigestDate, todaySlug } from "@/lib/utils/date";
import type { Digest, Insight, GhostNote as GhostNoteType } from "@/types";

interface PageProps {
  params: { date: string };
}

export default async function DigestPage({ params }: PageProps) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { date } = params;

  const { data: digestRow } = await supabase
    .from("digests")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", date)
    .single();

  if (!digestRow) {
    if (date === todaySlug()) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("ingest_email")
        .eq("id", user.id)
        .single();
      return <EmptyState ingestEmail={profile?.ingest_email ?? null} />;
    }
    notFound();
  }

  const digest = digestRow as Digest;

  const [insightsRes, ghostNotesRes, profileRes] = await Promise.all([
    supabase
      .from("insights")
      .select("*")
      .in("id", digest.insight_ids)
      .order("relevance_score", { ascending: false }),
    supabase
      .from("ghost_notes")
      .select("*")
      .in("id", digest.ghost_note_ids)
      .order("confidence_score", { ascending: false }),
    supabase
      .from("profiles")
      .select("display_name, plan")
      .eq("id", user.id)
      .single(),
  ]);

  const insights = (insightsRes.data ?? []) as Insight[];
  const ghostNotes = (ghostNotesRes.data ?? []) as GhostNoteType[];
  const profile = profileRes.data;

  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <p className="text-xs text-lingar-ghost uppercase tracking-widest mb-1">
          {formatDigestDate(date)}
          {profile?.display_name ? ` · ${profile.display_name}` : ""}
        </p>
        <h1 className="text-2xl font-bold leading-snug tracking-tight">
          {digest.headline ?? "Your daily brief"}
        </h1>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-lingar-ghost mb-4">
            Intelligence ({insights.length})
          </h2>
          <div className="space-y-4">
            {insights.map((insight) => (
              <InsightItem key={insight.id} insight={insight} />
            ))}
          </div>
        </section>
      )}

      {/* Ghost Notes */}
      {ghostNotes.length > 0 ? (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-lingar-ghost mb-4">
            From the Ghost ({ghostNotes.length})
          </h2>
          <div className="space-y-8">
            {ghostNotes.map((note) => (
              <GhostNote key={note.id} note={note} />
            ))}
          </div>
        </section>
      ) : profile?.plan === "free" ? (
        <section className="border border-dashed border-gray-200 rounded-lg p-6 text-center space-y-2">
          <p className="text-sm font-medium text-lingar-ink">Ghost Notes are a Pro feature</p>
          <p className="text-sm text-lingar-ghost">
            Upgrade to see the patterns, contradictions, and opportunities the Ghost has spotted in your reading history.
          </p>
        </section>
      ) : null}

      {/* Source Health */}
      <SourceHealth userId={user.id} />
    </div>
  );
}

function EmptyState({ ingestEmail }: { ingestEmail: string | null }) {
  return (
    <div className="pt-16 space-y-4 max-w-sm">
      <p className="text-xs text-lingar-ghost uppercase tracking-widest">Today</p>
      <h1 className="text-2xl font-bold">Nothing yet.</h1>
      <p className="text-gray-600 text-sm leading-relaxed">
        Forward a newsletter to your ingest address. The Ghost will get to work.
      </p>
      {ingestEmail && (
        <div className="border border-lingar-ink rounded-lg px-4 py-3 bg-lingar-ink text-lingar-paper font-mono text-sm break-all">
          {ingestEmail}
        </div>
      )}
      <p className="text-xs text-lingar-ghost">
        Copy the address above and forward any newsletter to it.
      </p>
    </div>
  );
}
