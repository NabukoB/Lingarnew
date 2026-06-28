"use client";

import ReactMarkdown from "react-markdown";
import type { GhostNote as GhostNoteType } from "@/types";

function GhostIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A050" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v9l2.5-2 2.5 2 2.5-2 2.5 2 2.5-2 2.5 2v-9a8 8 0 0 0-8-8z" />
    </svg>
  );
}

export function GhostNote({ note }: { note: GhostNoteType }) {
  return (
    <div className="bg-lingar-surface border border-lingar-gold/40 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-lingar-surface2 border border-lingar-gold/30 flex items-center justify-center shrink-0">
          <GhostIcon />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <p className="text-[22px] font-bold text-lingar-paper leading-snug">Ghost Note</p>
            <span className="text-lingar-gold text-[16px] shrink-0 mt-1">✦</span>
          </div>
          <p className="text-[12px] text-lingar-gold font-medium mb-3">Why this matters to you</p>
          <div className="text-[13px] text-gray-300 leading-relaxed prose prose-sm max-w-none prose-invert">
            <ReactMarkdown>{note.body}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
