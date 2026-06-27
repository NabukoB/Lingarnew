"use client";

import ReactMarkdown from "react-markdown";
import type { GhostNote as GhostNoteType } from "@/types";

const ICON: Record<string, string> = {
  connection: "↗",
  contradiction: "⚠",
  opportunity: "◈",
};

export function GhostNote({ note }: { note: GhostNoteType }) {
  const icon = ICON[note.note_type] ?? "●";
  const isSpeculative = note.confidence_score < 0.7;

  return (
    <div className="bg-lingar-surface border border-lingar-gold/40 rounded-2xl overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div className="w-9 h-9 rounded-xl bg-lingar-surface2 flex items-center justify-center shrink-0 text-base text-lingar-gold">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-lingar-gold">
              Why this matters to you
            </p>
            <span className="text-lingar-gold text-[12px] shrink-0">✦</span>
          </div>
          <h4 className="font-semibold text-[14px] text-lingar-paper leading-snug mb-2">
            {note.title}
          </h4>
          <div className="text-[12px] text-gray-300 leading-relaxed prose prose-sm max-w-none prose-invert">
            <ReactMarkdown>{note.body}</ReactMarkdown>
          </div>
          {isSpeculative && (
            <p className="text-[10px] text-lingar-ghost italic mt-1">speculative</p>
          )}
        </div>
      </div>
      <div className="px-4 py-2.5 border-t border-white/10 flex items-center justify-between">
        <span className="text-[10px] text-lingar-ghost">
          {Math.round(note.confidence_score * 100)}% confidence
        </span>
        <span className="text-[11px] text-lingar-gold font-medium">View →</span>
      </div>
    </div>
  );
}
