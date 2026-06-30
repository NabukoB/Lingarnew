import { createSupabaseServerClient } from "@/lib/supabase/server";
import { KanbanBoard } from "@/components/crm/KanbanBoard";
import { StatsBar } from "@/components/crm/StatsBar";
import { redirect } from "next/navigation";
import { endOfToday } from "date-fns";
import type { CrmLeadWithContact } from "@/types/crm";

export const dynamic = "force-dynamic";

export default async function CrmPipelinePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  console.log("[crm/page] user.id:", user.id);

  const { data: rawLeads, error: leadsError } = await supabase
    .from("crm_leads")
    .select("*, contact:wa_contacts(*)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  console.log(
    "[crm/page] rawLeads count:",
    rawLeads?.length ?? 0,
    "error:",
    JSON.stringify(leadsError)
  );

  // Enrich with message counts
  const leads: CrmLeadWithContact[] = await Promise.all(
    (rawLeads ?? []).map(async (lead) => {
      const { count } = await supabase
        .from("wa_messages")
        .select("*", { count: "exact", head: true })
        .eq("contact_id", lead.contact_id);

      const { data: lastMsg } = await supabase
        .from("wa_messages")
        .select("received_at")
        .eq("contact_id", lead.contact_id)
        .order("received_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        ...lead,
        message_count: count ?? 0,
        last_message_at: lastMsg?.received_at ?? null,
      } as CrmLeadWithContact;
    })
  );

  const { count: dueFollowUps } = await supabase
    .from("crm_follow_ups")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "pending")
    .lte("due_at", endOfToday().toISOString());

  const hotCount = leads.filter((l) => l.stage === "hot").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-fundiops-text">Pipeline</h1>
        <p className="text-sm text-fundiops-muted">
          {leads.length} lead{leads.length !== 1 ? "s" : ""} tracked
        </p>
      </div>
      <StatsBar total={leads.length} hot={hotCount} dueFollowUps={dueFollowUps ?? 0} />
      <KanbanBoard leads={leads} />
    </div>
  );
}
