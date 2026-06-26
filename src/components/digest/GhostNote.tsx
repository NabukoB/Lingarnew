"use client";

import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils/cn";
import type { GhostNote as GhostNoteType, GhostNoteType as NoteType } from "@/types";

const NOTE_CONFIG: Record<
  NoteType,
  { label: string; borderColor: string; labelColor: string; icon: string }
> = {
  connection: {
    label: "Pattern Detected",
    borderColor: "border-blue-400",
    labelColor: "text-blue-600",
    icon: "⟳",
  },
  contradiction: {
    label: "Contradiction Spotted",
    borderColor: "border-amber-400",
    labelColor: "text-amber-600",
    icon: "⚡",
  },
  opportunity: {
    label: "Opportunity Identified",
    borderColor: "border-emerald-400",
    labelColor: "text-emerald-600",
    icon: "◈",
  },
};

interface GhostNoteProps {
  note: GhostNoteType;
}

export function GhostNote({ note }: GhostNoteProps) {
  const config = NOTE_CONFIG[note.note_type];

  return (
    <article
      className={cn(
        "border-l-4 pl-5 py-1 space-y-2",
        config.borderColor
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("text-xs font-semibold uppercase tracking-widest", config.labelColor)}>
          {config.icon} {config.label}
        </span>
        <span className="text-xs text-lingar-ghost ml-auto">
          {Math.round(note.confidence_score * 100)}% confidence
          {note.confidence_score < 0.7 && (
            <span className="ml-1 italic">(speculative)</span>
          )}
        </span>
      </div>

      <h4 className="font-semibold text-lingar-ink leading-snug">{note.title}</h4>

      <div className="prose prose-sm prose-gray max-w-none text-gray-700">
        <ReactMarkdown>{note.body}</ReactMarkdown>
      </div>
    </article>
  );
}
