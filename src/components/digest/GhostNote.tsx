"use client";

import ReactMarkdown from "react-markdown";
import type { GhostNote as GhostNoteType, GhostNoteType as NoteType } from "@/types";

const NOTE_CONFIG: Record<NoteType, { label: string; bg: string; text: string; iconBg: string; icon: string }> = {
  connection: {
    label: "Trend",
    bg: "bg-blue-50",
    text: "text-blue-600",
    iconBg: "bg-blue-100",
    icon: "↗",
  },
  contradiction: {
    label: "Warning",
    bg: "bg-amber-50",
    text: "text-amber-600",
    iconBg: "bg-amber-100",
    icon: "⚠",
  },
  opportunity: {
    label: "Opportunity",
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    iconBg: "bg-emerald-100",
    icon: "◈",
  },
};

export function GhostNote({ note }: { note: GhostNoteType }) {
  const config = NOTE_CONFIG[note.note_type];
  const isSpeculative = note.confidence_score < 0.7;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div className={`w-10 h-10 rounded-xl ${config.iconBg} flex items-center justify-center shrink-0 text-lg`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
              {config.label}
            </span>
            {isSpeculative && (
              <span className="text-[10px] text-lingar-ghost italic">speculative</span>
            )}
          </div>
          <h4 className="font-semibold text-[14px] text-lingar-ink leading-snug mb-1">
            {note.title}
          </h4>
          <div className="text-[12px] text-gray-600 leading-relaxed prose prose-sm max-w-none">
            <ReactMarkdown>{note.body}</ReactMarkdown>
          </div>
        </div>
      </div>
      <div className="px-4 py-2 border-t border-gray-50 flex items-center justify-between">
        <span className="text-[10px] text-lingar-ghost">
          {Math.round(note.confidence_score * 100)}% confidence
        </span>
        <span className="text-[11px] text-lingar-accent font-medium">View →</span>
      </div>
    </div>
  );
}
