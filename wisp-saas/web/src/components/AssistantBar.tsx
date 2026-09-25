"use client";

import { ArrowUp } from "lucide-react";
import { useState } from "react";

export function AssistantBar({ placeholder = "Ask anything…" }: { placeholder?: string }) {
  const [q, setQ] = useState("");
  return (
    <form
      aria-label="AI assistant"
      onSubmit={(e) => {
        e.preventDefault();
        setQ("");
      }}
      className="flex items-center gap-3 rounded-card bg-white py-2.5 pl-3 pr-2.5 shadow-card"
    >
      <span
        aria-hidden
        className="h-12 w-12 shrink-0 rounded-full shadow-brand"
        style={{ background: "radial-gradient(circle at 35% 30%, #93c5fd 0%, #3b82f6 45%, #1d4ed8 100%)" }}
      />
      <label className="min-w-0 flex-grow">
        <span className="sr-only">Ask the assistant</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-slate-400"
        />
      </label>
      <button
        type="submit"
        aria-label="Send"
        disabled={!q.trim()}
        className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-blue-600 text-white disabled:bg-blue-300"
      >
        <ArrowUp aria-hidden size={18} strokeWidth={2.4} />
      </button>
    </form>
  );
}
