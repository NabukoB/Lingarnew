"use client";

import { Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import * as React from "react";
import { cn } from "@/lib/utils";

const AssistantPanel = dynamic(() => import("./AssistantPanel").then((m) => m.AssistantPanel), { ssr: false });

type Ctx = { ask: (question?: string) => void };
const AssistantCtx = React.createContext<Ctx>({ ask: () => {} });
export const useAssistant = () => React.useContext(AssistantCtx);

/** Holds the assistant chat for the whole dashboard; the panel loads on first open and keeps its conversation. */
export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [initial, setInitial] = React.useState<string | undefined>();
  const ctx = React.useMemo<Ctx>(
    () => ({
      ask: (q) => {
        setInitial(q);
        setLoaded(true);
        setOpen(true);
      },
    }),
    [],
  );
  return (
    <AssistantCtx.Provider value={ctx}>
      {children}
      {loaded && <AssistantPanel open={open} onOpenChange={setOpen} initial={initial} />}
    </AssistantCtx.Provider>
  );
}

/** Round "Ask" button; `wide` shows the label (sidebar). */
export function AskButton({ wide = false, className }: { wide?: boolean; className?: string }) {
  const { ask } = useAssistant();
  return (
    <button
      type="button"
      onClick={() => ask()}
      aria-label="Ask the assistant"
      className={cn(
        "flex h-[46px] shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 font-bold text-white shadow-brand transition hover:brightness-110 active:scale-[0.97]",
        wide ? "w-full px-4 text-sm" : "w-[46px]",
        className,
      )}
    >
      <Sparkles aria-hidden size={18} strokeWidth={2.4} />
      {wide && <span>Ask</span>}
    </button>
  );
}
