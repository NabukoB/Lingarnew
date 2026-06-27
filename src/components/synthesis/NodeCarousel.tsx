"use client";

import { useState } from "react";
import { NodeContextPanel } from "./NodeContextPanel";
import type { SynthesisNode, GhostNoteType } from "@/types";

const DOMINANT_STYLES: Record<
  GhostNoteType,
  { border: string; badge: string; badgeText: string; icon: string; iconColor: string }
> = {
  connection: {
    border: "border-blue-500/40",
    badge: "bg-blue-900/50 text-blue-300",
    badgeText: "Trend",
    icon: "↗",
    iconColor: "text-blue-400",
  },
  contradiction: {
    border: "border-amber-500/40",
    badge: "bg-amber-900/50 text-amber-300",
    badgeText: "Tension",
    icon: "⚠",
    iconColor: "text-amber-400",
  },
  opportunity: {
    border: "border-emerald-500/40",
    badge: "bg-emerald-900/50 text-emerald-300",
    badgeText: "Opportunity",
    icon: "◈",
    iconColor: "text-emerald-400",
  },
};

const NEUTRAL_STYLE = {
  border: "border-white/10",
  badge: "bg-lingar-surface2 text-lingar-ghost",
  badgeText: "Topic",
  icon: "○",
  iconColor: "text-lingar-ghost",
};

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
      className={`shrink-0 w-36 h-44 rounded-2xl bg-lingar-surface border ${style.border} p-4 flex flex-col justify-between text-left active:scale-95 transition-transform`}
    >
      <div>
        <div className="w-9 h-9 rounded-xl bg-lingar-surface2 flex items-center justify-center text-base mb-3">
          <span className={style.iconColor}>{style.icon}</span>
        </div>
        <p className="text-[13px] font-semibold text-lingar-paper leading-snug capitalize line-clamp-3">
          {node.tag}
        </p>
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] text-lingar-ghost">
          {node.insightCount} insight{node.insightCount !== 1 ? "s" : ""}
        </p>
        {node.dominantType && (
          <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${style.badge}`}>
            {style.badgeText}
          </span>
        )}
      </div>
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
          Forward newsletters to build your knowledge graph. Topics emerge as the Ghost finds patterns.
        </p>
      </div>
    );
  }

  const row1 = nodes.filter((_, i) => i % 2 === 0);
  const row2 = nodes.filter((_, i) => i % 2 === 1);

  return (
    <>
      <div className="space-y-3 -mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 pb-1">
          {row1.map((node) => (
            <NodeCard key={node.tag} node={node} onSelect={setSelected} />
          ))}
        </div>
        {row2.length > 0 && (
          <div className="flex gap-3 pl-[72px]">
            {row2.map((node) => (
              <NodeCard key={node.tag} node={node} onSelect={setSelected} />
            ))}
          </div>
        )}
      </div>

      <NodeContextPanel node={selected} onClose={() => setSelected(null)} />
    </>
  );
}
