import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InsightItem } from "@/components/digest/InsightItem";
import { GhostNote } from "@/components/digest/GhostNote";
import { StatsRow } from "@/components/digest/StatsRow";
import { DailyBriefCard } from "@/components/digest/DailyBriefCard";
import { TensionMapping } from "@/components/digest/TensionMapping";
import { SourceHealth } from "@/components/sources/SourceHealth";
import { RefreshBriefButton } from "@/components/digest/RefreshBriefButton";
import { todaySlug } from "@/lib/utils/date";
import type { Digest, Insight, GhostNote as GhostNoteType, Source } from "@/types";

interface PageProps {
  params: { date: string };
}

export default async function DigestPage({ params }: PageProps) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
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
        .select("ingest_email, display_name")
        .eq("id", user.id)
        .single();
      return <EmptyState ingestEmail={profile?.ingest_email ?? null} />;
    }
    notFound();
  }

  const digest = digestRow as Digest;

  const [insightsRes, ghostNotesRes, sourcesRes, ghostNoteCountRes] = await Promise.all([
    supabase.from("insights").select("*").in("id", digest.insight_ids).order("relevance_score", { ascending: false }),
    digest.ghost_note_ids.length > 0
      ? supabase.from("ghost_notes").select("*").in("id", digest.ghost_note_ids).order("confidence_score", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from("sources").select("id, from_name, from_email, send_count, useful_count").eq("user_id", user.id),
    digest.ghost_note_ids.length === 0
      ? supabase.from("ghost_notes").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("confidence_score", 0.6)
      : Promise.resolve({ count: 0 }),
  ]);

  const insights = (insightsRes.data ?? []) as Insight[];
  const ghostNotes = (ghostNotesRes.data ?? []) as GhostNoteType[];
  const sources = (sourcesRes.data ?? []) as Pick<Source, "id" | "from_name" | "from_email" | "send_count" | "useful_count">[];
  const hasUnsyncedGhostNotes = ghostNotes.length === 0 && (ghostNoteCountRes.count ?? 0) > 0;

  // Compute Knowledge Health %
  const totalSend = sources.reduce((sum, s) => sum + s.send_count, 0);
  const totalUseful = sources.reduce((sum, s) => sum + s.useful_count, 0);
  const healthPct = totalSend > 0 ? Math.round((totalUseful / totalSend) * 100) : 100;

  // Top 3 deduplicated tags from insights
  const tagCounts = new Map<string, number>();
  for (const insight of insights) {
    for (const tag of insight.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  // For TensionMapping: build insightId → {summary, sourceName} map for contradiction notes
  const contradictionNotes = ghostNotes.filter((n) => n.note_type === "contradiction");
  const tensionInsightIds = new Set<string>();
  for (const note of contradictionNotes) {
    tensionInsightIds.add(note.trigger_insight_id);
    if (note.related_insight_ids[0]) tensionInsightIds.add(note.related_insight_ids[0]);
  }

  const sourceById = new Map(sources.map((s) => [s.id, s]));

  let insightMap = new Map<string, { summary: string; sourceName: string }>();
  if (tensionInsightIds.size > 0) {
    const { data: tensionInsights } = await supabase
      .from("insights")
      .select("id, summary, source_id")
      .in("id", Array.from(tensionInsightIds));

    for (const ins of tensionInsights ?? []) {
      const src = ins.source_id ? sourceById.get(ins.source_id) : undefined;
      insightMap.set(ins.id, {
        summary: ins.summary,
        sourceName: src?.from_name ?? src?.from_email ?? "Unknown source",
      });
    }
  }

  const opportunityCount = ghostNotes.filter((n) => n.note_type === "opportunity").length;

  // Featured note: prefer non-contradiction; fall back to first note of any type
  const featuredNote = (ghostNotes.find((n) => n.note_type !== "contradiction") ?? ghostNotes[0]) ?? null;
  const remainingNotes = ghostNotes.filter((n) => n !== featuredNote);

  return (
    <div className="space-y-4">
      <StatsRow
        healthPct={healthPct}
        insightCount={insights.length}
        opportunityCount={opportunityCount}
      />

      {digest.headline && (
        <DailyBriefCard digest={digest} topTags={topTags} />
      )}

      {/* Sync prompt when digest was built before ghost notes were generated */}
      {hasUnsyncedGhostNotes && <RefreshBriefButton date={date} />}

      {/* Featured Ghost Note — the Ghost's top insight for today */}
      {featuredNote && <GhostNote note={featuredNote} />}

      {/* Remaining Ghost Notes */}
      {remainingNotes.length > 0 && (
        <div className="space-y-3">
          {remainingNotes.map((note) => {
            if (note.note_type === "contradiction") {
              const triggerData = insightMap.get(note.trigger_insight_id);
              const relatedData = note.related_insight_ids[0]
                ? insightMap.get(note.related_insight_ids[0])
                : undefined;

              return (
                <TensionMapping
                  key={note.id}
                  note={note}
                  sourceA={{
                    name: triggerData?.sourceName ?? "Source A",
                    quote: triggerData?.summary ?? note.title,
                  }}
                  sourceB={{
                    name: relatedData?.sourceName ?? "Source B",
                    quote: relatedData?.summary ?? note.body.slice(0, 120),
                  }}
                />
              );
            }
            return <GhostNote key={note.id} note={note} />;
          })}
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-lingar-ghost">
              Today&apos;s Brief
            </h2>
            <span className="text-[11px] text-lingar-ghost">{insights.length} items</span>
          </div>
          <div className="space-y-3">
            {insights.map((insight) => (
              <InsightItem key={insight.id} insight={insight} />
            ))}
          </div>
        </section>
      )}

      <SourceHealth userId={user.id} />
    </div>
  );
}

function EmptyState({ ingestEmail }: { ingestEmail: string | null }) {
  return (
    <div className="space-y-4">
      <div className="bg-lingar-surface rounded-2xl p-5 space-y-3">
        <div className="w-10 h-10 rounded-xl bg-lingar-gold/10 flex items-center justify-center text-xl">📬</div>
        <h2 className="font-semibold text-[15px] text-lingar-paper">Forward a newsletter</h2>
        <p className="text-[13px] text-gray-300 leading-relaxed">
          The Ghost will extract insights, connect them to your history, and build your brief automatically.
        </p>
        {ingestEmail && (
          <div className="bg-lingar-dark rounded-xl px-4 py-3 font-mono text-[12px] text-lingar-paper break-all border border-white/10">
            {ingestEmail}
          </div>
        )}
        <p className="text-[11px] text-lingar-ghost">Tap and hold the address above to copy it.</p>
      </div>
    </div>
  );
}
