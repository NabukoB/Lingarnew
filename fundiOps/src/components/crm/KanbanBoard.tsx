"use client";

import { useState } from "react";
import { LeadCard } from "./LeadCard";
import type { CrmLeadWithContact, LeadStage } from "@/types/crm";

const STAGES: { key: LeadStage; label: string; color: string }[] = [
  { key: "new", label: "New", color: "border-t-gray-500" },
  { key: "contacted", label: "Contacted", color: "border-t-blue-500" },
  { key: "warm", label: "Warm", color: "border-t-amber-500" },
  { key: "hot", label: "Hot", color: "border-t-green-500" },
  { key: "closed_won", label: "Won", color: "border-t-emerald-400" },
  { key: "closed_lost", label: "Lost", color: "border-t-red-500" },
];

export function KanbanBoard({ leads }: { leads: CrmLeadWithContact[] }) {
  const [localLeads, setLocalLeads] = useState(leads);

  async function moveStage(leadId: string, newStage: LeadStage) {
    // Optimistic update
    setLocalLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l))
    );
    await fetch(`/api/crm/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 min-h-[70vh] snap-x snap-mandatory">
      {STAGES.map(({ key, label, color }) => {
        const col = localLeads.filter((l) => l.stage === key);
        return (
          <div
            key={key}
            className={`shrink-0 w-[85vw] sm:w-72 snap-start flex flex-col rounded-xl border-t-2 bg-fundiops-card border border-fundiops-border ${color}`}
          >
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-fundiops-text">{label}</span>
              <span className="text-xs bg-fundiops-border text-fundiops-muted rounded-full px-2 py-0.5">
                {col.length}
              </span>
            </div>
            <div className="flex-1 px-3 pb-3 space-y-3 overflow-y-auto">
              {col.map((lead) => (
                <div key={lead.id} className="group relative">
                  <LeadCard lead={lead} />
                  {/* Stage move dropdown on hover */}
                  <select
                    className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-xs bg-fundiops-bg border border-fundiops-border text-fundiops-muted rounded px-1 py-0.5 transition-opacity"
                    value={lead.stage}
                    onChange={(e) => moveStage(lead.id, e.target.value as LeadStage)}
                    onClick={(e) => e.preventDefault()}
                  >
                    {STAGES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              {col.length === 0 && (
                <p className="text-xs text-fundiops-muted text-center py-8">Empty</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
