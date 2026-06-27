"use client";

import { useState } from "react";
import { NodeContextPanel } from "./NodeContextPanel";
import type { SynthesisNode, GhostNoteType } from "@/types";

const DOMINANT_STYLES: Record<
  GhostNoteType,
  { border: string; badge: string; badgeText: string; iconBg: string; icon: string; iconColor: string }
> = {
  connection: {
    border: "border-blue-500/30",
    badge: "bg-blue-900/50 text-blue-300",
    badgeText: "Trend",
    iconBg: "bg-blue-900/40",
    icon: "↗",
    iconColor: "text-blue-400",
  },
  contradiction: {
    border: "border-amber-500/40",
    badge: "bg-amber-900/50 text-amber-300",
    badgeText: "Tension",
    iconBg: "bg-amber-900/40",
    icon: "⚠",
    iconColor: "text-amber-400",
  },
  opportunity: {
    border: "border-emerald-500/30",
    badge: "bg-emerald-900/50 text-emerald-300",
    badgeText: "Opportunity",
    iconBg: "bg-emerald-900/40",
    icon: "◈",
    iconColor: "text-emerald-400",
  },
};

const NEUTRAL_STYLE = {
  border: "border-white/10",
  badge: "bg-white/5 text-lingar-ghost",
  badgeText: "Topic",
  iconBg: "bg-white/5",
  icon: "◉",
  iconColor: "text-lingar-ghost/40",
};

function formatTag(tag: string): string {
  return tag
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function NodeCard({
  node,
  onSelect,
}: {
  node: SynthesisNode;
  onSelect: (node: SynthesisNode) => void;
}) {
  const style = node.dominantType ? DOMINANT_STYLES[node.dominantType] : NEUTRAL_STYLE;

  return (
    <button
      onClick={() => onSelect(node)}
      className={`w-full rounded-2xl bg-lingar-surface border ${style.border} p-4 flex flex-col gap-3 text-left active:scale-[0.97] transition-transform`}
    >
      {/* Icon + badge row */}
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl ${style.iconBg} flex items-center justify-center text-base`}>
          <span className={style.iconColor}>{style.icon}</span>
        </div>
        {node.dominantType && (
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${style.badge}`}>
            {style.badgeText}
          </span>
        )}
      </div>

      {/* Tag name */}
      <p className="text-[14px] font-semibold text-lingar-paper leading-snug">
        {formatTag(node.tag)}
      </p>

      {/* Insight count */}
      <p className="text-[11px] text-lingar-ghost">
        {node.insightCount} insight{node.insightCount !== 1 ? "s" : ""}
      </p>
    </button>
  );
}

interface Props {
  nodes: SynthesisNode[];
}

export function NodeCarousel({ nodes }: Props) {
  const [selected, setSelected] = useState<SynthesisNode | null>(null);

  if (nodes.length === 0) {
    return (
      <div className="py-10 text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-lingar-gold/10 flex items-center justify-center mx-auto text-xl text-lingar-gold">
          ◈
        </div>
        <p className="text-sm font-semibold text-lingar-paper">No topic nodes yet</p>
        <p className="text-[12px] text-lingar-ghost leading-snug max-w-[220px] mx-auto">
          Add articles to build your knowledge graph. Topics emerge as the Ghost finds patterns.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* 2-column grid — all cards fully visible and tappable */}
      <div className="grid grid-cols-2 gap-3">
        {nodes.map((node) => (
          <NodeCard key={node.tag} node={node} onSelect={setSelected} />
        ))}
      </div>

      <NodeContextPanel node={selected} onClose={() => setSelected(null)} />
    </>
  );
}
