import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StageSelector } from "@/components/crm/StageSelector";
import { AutoReplyToggle } from "@/components/crm/AutoReplyToggle";
import { ConversationThread } from "@/components/crm/ConversationThread";
import { FollowUpRow } from "@/components/crm/FollowUpRow";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, Mail, Briefcase } from "lucide-react";
import type { CrmContactDetail } from "@/types/crm";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: { contactId: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [contactRes, messagesRes, leadRes, followUpsRes] = await Promise.all([
    supabase
      .from("wa_contacts")
      .select("*")
      .eq("id", params.contactId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("wa_messages")
      .select("*")
      .eq("contact_id", params.contactId)
      .eq("user_id", user.id)
      .order("received_at", { ascending: true })
      .limit(200),
    supabase
      .from("crm_leads")
      .select("*")
      .eq("contact_id", params.contactId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("crm_follow_ups")
      .select("*")
      .eq("contact_id", params.contactId)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("due_at", { ascending: true }),
  ]);

  if (contactRes.error) notFound();

  const contact: CrmContactDetail = {
    ...contactRes.data,
    lead: leadRes.data ?? null,
    messages: messagesRes.data ?? [],
    follow_ups: followUpsRes.data ?? [],
  };

  const name = contact.display_name ?? contact.phone;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href="/crm"
        className="inline-flex items-center gap-1 text-fundiops-muted text-sm mb-4 hover:text-fundiops-text"
      >
        <ArrowLeft size={14} /> Pipeline
      </Link>

      {/* Contact header */}
      <div className="bg-fundiops-card border border-fundiops-border rounded-2xl p-6 mb-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-fundiops-text">{name}</h1>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-fundiops-muted">
              <span className="flex items-center gap-1">
                <Phone size={13} /> {contact.phone}
              </span>
              {contact.email && (
                <span className="flex items-center gap-1">
                  <Mail size={13} /> {contact.email}
                </span>
              )}
              {contact.business_name && (
                <span className="flex items-center gap-1">
                  <Briefcase size={13} /> {contact.business_name}
                </span>
              )}
            </div>
            {contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {contact.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-fundiops-border text-fundiops-muted px-2 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <AutoReplyToggle contactId={contact.id} defaultValue={contact.auto_reply} />
        </div>

        {contact.interest_summary && (
          <p className="mt-4 text-sm text-fundiops-text-muted border-t border-fundiops-border pt-4">
            {contact.interest_summary}
          </p>
        )}
      </div>

      {/* Lead status */}
      {contact.lead && (
        <div className="bg-fundiops-card border border-fundiops-border rounded-2xl p-6 mb-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fundiops-text">Lead Stage</h2>
          </div>
          <StageSelector
            leadId={contact.lead.id}
            currentStage={contact.lead.stage}
          />
          {contact.lead.ai_summary && (
            <div>
              <p className="text-xs text-fundiops-muted mb-1">AI Summary</p>
              <p className="text-sm text-fundiops-text-muted">{contact.lead.ai_summary}</p>
            </div>
          )}
          {contact.lead.ai_next_action && (
            <div>
              <p className="text-xs text-fundiops-muted mb-1">Suggested Next Action</p>
              <p className="text-sm text-fundiops-accent">{contact.lead.ai_next_action}</p>
            </div>
          )}
        </div>
      )}

      {/* Two-column layout: conversation + follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Conversation */}
        <div className="lg:col-span-2 bg-fundiops-card border border-fundiops-border rounded-2xl p-6 flex flex-col" style={{ minHeight: "500px" }}>
          <h2 className="text-sm font-semibold text-fundiops-text mb-4">
            Conversation ({contact.messages.length})
          </h2>
          <ConversationThread
            contactId={contact.id}
            messages={contact.messages}
          />
        </div>

        {/* Follow-ups */}
        <div className="bg-fundiops-card border border-fundiops-border rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-fundiops-text mb-4">
            Follow-ups ({contact.follow_ups.length})
          </h2>
          <div className="space-y-3">
            {contact.follow_ups.map((fu) => (
              <FollowUpRow key={fu.id} followUp={fu} />
            ))}
            {contact.follow_ups.length === 0 && (
              <p className="text-xs text-fundiops-muted text-center py-8">
                No pending follow-ups
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
