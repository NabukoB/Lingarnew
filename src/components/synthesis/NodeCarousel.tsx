"use client";

import { useState } from "react";
import { NodeContextPanel } from "./NodeContextPanel";
import type { SynthesisNode, GhostNoteType } from "@/types";

const DOMINANT_STYLES: Record<
  GhostNoteType,
  { border: string; badge: string; badgeText: string; icon: string; iconBg: string }
> = {
  connection: {
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-600",
    badgeText: "Trend",
    icon: "↗",
    iconBg: "bg-blue-100",
  },
  contradiction: {
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-600",
    badgeText: "Tension",
    icon: "⚠",
    iconBg: "bg-amber-100",
  },
  opportunity: {
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-600",
    badgeText: "Opportunity",
    icon: "◈",
    iconBg: "bg-emerald-100",
  },
};

const NEUTRAL_STYLE = {
  border: "border-gray-200",
  badge: "bg-gray-100 text-lingar-ghost",
  badgeText: "Topic",
  icon: "○",
  iconBg: "bg-gray-100",
};

function NodeCard({
  node,
  onSelect,
}: {
  node: SynthesisNode;
  onSelect: (node: SynthesisNode) => void;
}) {
  const style = node.dominantType
    ? DOMINANT_STYLES[node.dominantType]
    : NEUTRAL_STYLE;

  return (
    <button
      onClick={() => onSelect(node)}
      className={`shrink-0 w-36 h-44 rounded-2xl bg-white border ${style.border} p-4 flex flex-col justify-between text-left shadow-sm active:scale-95 transition-transform`}
    >
      <div>
        <div
          className={`w-9 h-9 rounded-xl ${style.iconBg} flex items-center justify-center text-base mb-3`}
        >
          {style.icon}
        </div>
        <p className="text-[13px] font-semibold text-lingar-ink leading-snug capitalize line-clamp-3">
          {node.tag}
        </p>
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] text-lingar-ghost">
          {node.insightCount} insight{node.insightCount !== 1 ? "s" : ""}
        </p>
        {node.dominantType && (
          <span
            className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${style.badge}`}
          >
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
        <div className="w-12 h-12 rounded-2xl bg-lingar-accent/10 flex items-center justify-center mx-auto text-xl">
          ◈
        </div>
        <p className="text-sm font-semibold text-lingar-ink">No topic nodes yet</p>
        <p className="text-[12px] text-lingar-ghost leading-snug max-w-[220px] mx-auto">
          Forward newsletters to build your knowledge graph. Topics emerge as the Ghost finds patterns.
        </p>
      </div>
    );
  }

  // Split into two rows for a staggered grid feel
  const row1 = nodes.filter((_, i) => i % 2 === 0);
  const row2 = nodes.filter((_, i) => i % 2 === 1);

  return (
    <>
      <div className="space-y-3 -mx-4 px-4 overflow-x-auto scrollbar-hide">
        {/* Row 1 */}
        <div className="flex gap-3 pb-1">
          {row1.map((node) => (
            <NodeCard key={node.tag} node={node} onSelect={setSelected} />
          ))}
        </div>
        {/* Row 2 — offset to create stagger */}
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
