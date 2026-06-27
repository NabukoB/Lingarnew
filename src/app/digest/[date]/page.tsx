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

function greeting(name: string | null | undefined) {
  const hour = new Date().getHours();
  const time = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return `Good ${time}${name ? `, ${name}` : ""}`;
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
      return <EmptyState ingestEmail={profile?.ingest_email ?? null} name={profile?.display_name} />;
    }
    notFound();
  }

  const digest = digestRow as Digest;

  const [insightsRes, ghostNotesRes, profileRes] = await Promise.all([
    supabase.from("insights").select("*").in("id", digest.insight_ids).order("relevance_score", { ascending: false }),
    supabase.from("ghost_notes").select("*").in("id", digest.ghost_note_ids).order("confidence_score", { ascending: false }),
    supabase.from("profiles").select("display_name, plan").eq("id", user.id).single(),
  ]);

  const insights = (insightsRes.data ?? []) as Insight[];
  const ghostNotes = (ghostNotesRes.data ?? []) as GhostNoteType[];
  const profile = profileRes.data;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{greeting(profile?.display_name)} 👋</h1>
          <p className="text-[13px] text-lingar-ghost mt-1">
            {formatDigestDate(date)} · {insights.length} insight{insights.length !== 1 ? "s" : ""} waiting
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-lingar-accent flex items-center justify-center text-white font-bold text-sm shrink-0">
          {(profile?.display_name?.[0] ?? user.email?.[0] ?? "L").toUpperCase()}
        </div>
      </div>

      {/* Headline */}
      {digest.headline && (
        <div className="bg-lingar-accent/5 border border-lingar-accent/20 rounded-2xl px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-lingar-accent mb-1">Today&apos;s theme</p>
          <p className="text-[14px] font-semibold text-lingar-ink leading-snug">{digest.headline}</p>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
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

      {/* Ghost Notes / Opportunity Feed */}
      {ghostNotes.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-lingar-ghost">
              Opportunity Feed
            </h2>
            <span className="text-[11px] text-lingar-accent font-medium">From the Ghost</span>
          </div>
          <div className="space-y-3">
            {ghostNotes.map((note) => (
              <GhostNote key={note.id} note={note} />
            ))}
          </div>
        </section>
      ) : profile?.plan === "free" ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-5 text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mx-auto text-lg">◈</div>
          <p className="text-[13px] font-semibold text-lingar-ink">Ghost Notes are a Pro feature</p>
          <p className="text-[12px] text-lingar-ghost leading-snug">
            Upgrade to see patterns, contradictions, and opportunities the Ghost spots in your reading history.
          </p>
        </div>
      ) : null}

      {/* Source Health */}
      <SourceHealth userId={user.id} />
    </div>
  );
}

function EmptyState({ ingestEmail, name }: { ingestEmail: string | null; name?: string | null }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting(name)} 👋</h1>
        <p className="text-[13px] text-lingar-ghost mt-1">Nothing yet today.</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <div className="w-10 h-10 rounded-xl bg-lingar-accent/10 flex items-center justify-center text-xl">📬</div>
        <h2 className="font-semibold text-[15px]">Forward a newsletter</h2>
        <p className="text-[13px] text-gray-600 leading-relaxed">
          The Ghost will extract insights, connect them to your history, and build your brief automatically.
        </p>
        {ingestEmail && (
          <div className="bg-lingar-ink rounded-xl px-4 py-3 font-mono text-[12px] text-lingar-paper break-all">
            {ingestEmail}
          </div>
        )}
        <p className="text-[11px] text-lingar-ghost">Tap and hold the address above to copy it.</p>
      </div>
    </div>
  );
}
