"use client";

import { useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { SynthesisNode, GhostNoteType } from "@/types";

const TYPE_CONFIG: Record<
  GhostNoteType,
  { label: string; iconBg: string; iconColor: string; icon: string }
> = {
  connection: {
    label: "Trend",
    iconBg: "bg-blue-900/50",
    iconColor: "text-blue-400",
    icon: "↗",
  },
  contradiction: {
    label: "Warning",
    iconBg: "bg-amber-900/50",
    iconColor: "text-amber-400",
    icon: "⚠",
  },
  opportunity: {
    label: "Opportunity",
    iconBg: "bg-emerald-900/50",
    iconColor: "text-emerald-400",
    icon: "◈",
  },
};

interface Props {
  node: SynthesisNode | null;
  onClose: () => void;
}

export function NodeContextPanel({ node, onClose }: Props) {
  useEffect(() => {
    if (node) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [node]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          node ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={node?.tag ?? "Node context"}
        className={`fixed bottom-0 left-0 right-0 z-50 bg-lingar-surface rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out max-h-[85vh] overflow-hidden flex flex-col ${
          node ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-2 pb-4 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-lingar-ghost mb-1">
              Topic Node
            </p>
            <h2 className="text-xl font-bold text-lingar-paper truncate">
              {node?.tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </h2>
            <p className="text-[12px] text-lingar-ghost mt-0.5">
              {node?.insightCount ?? 0} insight{(node?.insightCount ?? 0) !== 1 ? "s" : ""} in your history
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-lingar-surface2 flex items-center justify-center text-lingar-ghost hover:text-lingar-paper transition-colors shrink-0 mt-1"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Ghost Notes */}
        <div className="overflow-y-auto flex-1 px-5 pb-4 space-y-3">
          {node?.topGhostNotes.length === 0 && (
            <p className="text-sm text-lingar-ghost py-4 text-center">
              No Ghost Notes for this topic yet.
            </p>
          )}
          {node?.topGhostNotes.map((note) => {
            const cfg = TYPE_CONFIG[note.note_type];
            const isSpeculative = note.confidence_score < 0.7;
            return (
              <div
                key={note.id}
                className="bg-lingar-surface2 rounded-2xl border border-white/10 overflow-hidden"
              >
                <div className="flex items-start gap-3 p-4">
                  <div className={`w-9 h-9 rounded-xl ${cfg.iconBg} flex items-center justify-center shrink-0 text-base ${cfg.iconColor}`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${cfg.iconColor}`}>
                        {cfg.label}
                      </span>
                      {isSpeculative && (
                        <span className="text-[10px] text-lingar-ghost italic">speculative</span>
                      )}
                    </div>
                    <h4 className="font-semibold text-[13px] text-lingar-paper leading-snug mb-1">
                      {note.title}
                    </h4>
                    <div className="text-[11px] text-gray-300 leading-relaxed prose prose-sm max-w-none prose-invert line-clamp-3">
                      <ReactMarkdown>{note.body}</ReactMarkdown>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-2 border-t border-white/10">
                  <span className="text-[10px] text-lingar-ghost">
                    {Math.round(note.confidence_score * 100)}% confidence
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div
          className="px-5 shrink-0 border-t border-white/10 pt-3"
          style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
        >
          <Link
            href={`/synthesis?q=${encodeURIComponent(node?.tag ?? "")}`}
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-lingar-gold text-lingar-ink text-sm font-semibold"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            Ask the Ghost about &ldquo;{node?.tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}&rdquo;
          </Link>
        </div>
      </div>
    </>
  );
}
