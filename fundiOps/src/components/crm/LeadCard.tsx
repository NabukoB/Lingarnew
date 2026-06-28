"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { CrmLeadWithContact } from "@/types/crm";

const urgencyColor = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  low: "bg-green-500/20 text-green-400 border-green-500/30",
};

const convTypeLabel: Record<string, string> = {
  new_lead: "New Lead",
  existing_customer: "Customer",
  support: "Support",
  spam: "Spam",
  unknown: "Unknown",
};

export function LeadCard({ lead }: { lead: CrmLeadWithContact }) {
  const { contact } = lead;
  const name = contact.display_name ?? contact.phone;
  const urgency = contact.urgency ?? "low";

  return (
    <Link href={`/crm/${contact.id}`}>
      <div className="bg-fundiops-card border border-fundiops-border rounded-xl p-4 hover:border-fundiops-accent/40 transition-colors cursor-pointer space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-fundiops-text truncate">{name}</p>
            {contact.business_name && (
              <p className="text-xs text-fundiops-muted truncate">{contact.business_name}</p>
            )}
          </div>
          <span
            className={cn(
              "shrink-0 text-xs px-2 py-0.5 rounded-full border capitalize",
              urgencyColor[urgency]
            )}
          >
            {urgency}
          </span>
        </div>

        {contact.interest_summary && (
          <p className="text-xs text-fundiops-text-muted line-clamp-2">
            {contact.interest_summary}
          </p>
        )}

        {lead.ai_next_action && (
          <div className="flex items-start gap-1.5 text-xs text-fundiops-accent">
            <TrendingUp size={12} className="mt-0.5 shrink-0" />
            <span className="line-clamp-1">{lead.ai_next_action}</span>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-fundiops-muted pt-1 border-t border-fundiops-border">
          <span className="flex items-center gap-1">
            <MessageCircle size={11} />
            {lead.message_count}
          </span>
          {lead.last_message_at && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {formatDistanceToNow(new Date(lead.last_message_at), { addSuffix: true })}
            </span>
          )}
          <span className="ml-auto text-fundiops-muted/70">
            {convTypeLabel[lead.conv_type] ?? lead.conv_type}
          </span>
        </div>
      </div>
    </Link>
  );
}
