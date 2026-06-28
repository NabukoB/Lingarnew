"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, isPast } from "date-fns";
import { Check, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { CrmFollowUp } from "@/types/crm";

interface FollowUpWithContact extends CrmFollowUp {
  contact?: { display_name: string | null; phone: string; business_name: string | null } | null;
}

export function FollowUpRow({ followUp }: { followUp: FollowUpWithContact }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const overdue = isPast(new Date(followUp.due_at)) && followUp.status === "pending";

  async function updateStatus(status: "sent" | "dismissed") {
    setLoading(true);
    await fetch(`/api/crm/follow-ups/${followUp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    router.refresh();
  }

  const contactName =
    followUp.contact?.display_name ?? followUp.contact?.phone ?? "Unknown";

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border",
        overdue
          ? "border-red-500/30 bg-red-500/5"
          : "border-fundiops-border bg-fundiops-card"
      )}
    >
      <div className={cn("mt-0.5 shrink-0", overdue ? "text-red-400" : "text-fundiops-muted")}>
        <Clock size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fundiops-text">{contactName}</p>
        {followUp.contact?.business_name && (
          <p className="text-xs text-fundiops-muted">{followUp.contact.business_name}</p>
        )}
        <p className="text-sm text-fundiops-text-muted mt-1">{followUp.note}</p>
        <p className={cn("text-xs mt-1", overdue ? "text-red-400" : "text-fundiops-muted")}>
          {overdue ? "Overdue · " : ""}
          {format(new Date(followUp.due_at), "PPp")}
        </p>
      </div>
      {followUp.status === "pending" && (
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => updateStatus("sent")}
            disabled={loading}
            className="p-1.5 rounded-lg bg-fundiops-accent/10 text-fundiops-accent hover:bg-fundiops-accent/20 transition-colors"
            title="Mark done"
          >
            <Check size={14} />
          </button>
          <button
            onClick={() => updateStatus("dismissed")}
            disabled={loading}
            className="p-1.5 rounded-lg bg-fundiops-border text-fundiops-muted hover:bg-fundiops-border/80 transition-colors"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
