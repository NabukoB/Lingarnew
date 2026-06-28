"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import type { LeadStage } from "@/types/crm";

const STAGES: { key: LeadStage; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "warm", label: "Warm" },
  { key: "hot", label: "Hot" },
  { key: "closed_won", label: "Won" },
  { key: "closed_lost", label: "Lost" },
];

export function StageSelector({
  leadId,
  currentStage,
}: {
  leadId: string;
  currentStage: LeadStage;
}) {
  const [stage, setStage] = useState(currentStage);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function updateStage(newStage: LeadStage) {
    setLoading(true);
    setStage(newStage);
    await fetch(`/api/crm/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-1">
      {STAGES.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => updateStage(key)}
          disabled={loading}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
            stage === key
              ? "bg-fundiops-accent text-black border-fundiops-accent"
              : "border-fundiops-border text-fundiops-muted hover:border-fundiops-accent/50"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
