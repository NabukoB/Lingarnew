"use client";

import { AnimatePresence } from "framer-motion";
import { ArrowUp, Check, Loader2, Sparkles, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { m } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { assistantStatus, runProposal } from "@/lib/actions";
import { historyFor, parseSSE, toBlocks, type AssistantEvent, type ChatMessage, type Inline, type Proposal } from "@/lib/assistant";
import { cn } from "@/lib/utils";

type Turn = {
  question: string;
  answer: string;
  status: string | null;
  proposals: (Proposal & { state: "open" | "running" | "done" | "cancelled"; result?: string; error?: string })[];
  error?: { message: string; hint?: string };
  streaming: boolean;
};

const suggestions = ["Any routers down?", "Unmatched payments?", "Today's money", "Why is Mwiki slow?"];

function Text({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.bold ? (
          <strong key={i} className="font-extrabold">
            {p.text}
          </strong>
        ) : (
          <React.Fragment key={i}>{p.text}</React.Fragment>
        ),
      )}
    </>
  );
}

function Answer({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2 text-[14.5px] leading-relaxed">
      {toBlocks(text).map((b, i) =>
        b.kind === "p" ? (
          <p key={i}>
            <Text parts={b.parts} />
          </p>
        ) : b.kind === "ul" ? (
          <ul key={i} className="flex list-disc flex-col gap-1 pl-5 marker:text-primary">
            {b.items.map((it, j) => (
              <li key={j}>
                <Text parts={it} />
              </li>
            ))}
          </ul>
        ) : (
          <ol key={i} className="flex list-decimal flex-col gap-1 pl-5 marker:font-bold marker:text-primary">
            {b.items.map((it, j) => (
              <li key={j}>
                <Text parts={it} />
              </li>
            ))}
          </ol>
        ),
      )}
    </div>
  );
}

function ProposalCard({ p, onConfirm, onCancel }: { p: Turn["proposals"][number]; onConfirm: () => void; onCancel: () => void }) {
  return (
    <m.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 rounded-tile bg-card p-4 shadow-soft">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-extrabold">{p.title}</span>
        {p.detail && <span className="text-xs font-semibold text-muted-foreground">{p.detail}</span>}
      </div>
      {p.state === "done" ? (
        <span className="flex items-center gap-1.5 text-sm font-bold text-green-700">
          <Check aria-hidden size={16} strokeWidth={3} />
          {p.result}
        </span>
      ) : p.state === "cancelled" ? (
        <span className="text-sm font-semibold text-muted-foreground">Cancelled</span>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={onConfirm} loading={p.state === "running"}>
            Confirm
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={p.state === "running"}>
            Cancel
          </Button>
          {p.error && <span className="text-xs font-semibold text-destructive">{p.error}</span>}
        </div>
      )}
    </m.div>
  );
}

export function AssistantPanel({ open, onOpenChange, initial }: { open: boolean; onOpenChange: (o: boolean) => void; initial?: string }) {
  const router = useRouter();
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [draft, setDraft] = React.useState("");
  const [status, setStatus] = React.useState<{ enabled: boolean; remaining: number | null } | null>(null);
  const abort = React.useRef<AbortController | null>(null);
  const scroller = React.useRef<HTMLDivElement>(null);
  const input = React.useRef<HTMLTextAreaElement>(null);
  const busy = turns.some((t) => t.streaming);
  const asked = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    if (open) void assistantStatus().then(setStatus);
  }, [open]);

  React.useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [turns]);

  const patch = (i: number, f: (t: Turn) => Turn) => setTurns((ts) => ts.map((t, j) => (j === i ? f(t) : t)));

  const ask = React.useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || busy) return;
      setDraft("");
      const st = status ?? (await assistantStatus());
      if (!status) setStatus(st);
      const history: ChatMessage[] = turns.flatMap((t) => [
        { role: "user" as const, text: t.question },
        { role: "assistant" as const, text: t.answer },
      ]);
      const index = turns.length;
      if (!st.enabled) {
        setTurns((ts) => [...ts, { question: q, answer: "", status: null, proposals: [], streaming: false }]);
        return;
      }
      setTurns((ts) => [...ts, { question: q, answer: "", status: null, proposals: [], streaming: true }]);
      const ctrl = new AbortController();
      abort.current = ctrl;
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: historyFor(history, q) }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          const j = (await res.json().catch(() => null)) as { error?: { message: string; hint?: string } } | null;
          if (res.status === 401) router.push("/login?expired=1");
          patch(index, (t) => ({ ...t, streaming: false, error: j?.error ?? { message: "The assistant didn't answer.", hint: "Try again." } }));
          return;
        }
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buf = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          const parsed = parseSSE(buf + value);
          buf = parsed.rest;
          for (const e of parsed.events) apply(index, e);
        }
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          patch(index, (t) => ({ ...t, error: { message: "Connection lost.", hint: "Ask again." } }));
        }
      } finally {
        patch(index, (t) => ({ ...t, streaming: false, status: null }));
        abort.current = null;
        setStatus((s) => (s && s.remaining !== null ? { ...s, remaining: Math.max(0, s.remaining - 1) } : s));
        input.current?.focus();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, turns, status],
  );

  function apply(i: number, e: AssistantEvent) {
    switch (e.type) {
      case "text":
        patch(i, (t) => ({ ...t, answer: t.answer + e.text, status: null }));
        break;
      case "status":
        patch(i, (t) => ({ ...t, status: e.text }));
        break;
      case "proposal":
        patch(i, (t) => ({ ...t, proposals: [...t.proposals, { ...e.proposal, state: "open" }] }));
        break;
      case "error":
        patch(i, (t) => ({ ...t, error: e.error }));
        break;
      case "done":
        patch(i, (t) => ({ ...t, streaming: false, status: null }));
        break;
    }
  }

  // Ask the question the palette passed in, once per open.
  React.useEffect(() => {
    if (open && initial && asked.current !== initial) {
      asked.current = initial;
      void ask(initial);
    }
    if (!open) asked.current = undefined;
  }, [open, initial, ask]);

  const confirm = async (ti: number, pi: number) => {
    const p = turns[ti]!.proposals[pi]!;
    const set = (f: (x: typeof p) => typeof p) => patch(ti, (t) => ({ ...t, proposals: t.proposals.map((x, j) => (j === pi ? f(x) : x)) }));
    set((x) => ({ ...x, state: "running", error: undefined }));
    const r = await runProposal(p);
    if (r.ok) {
      set((x) => ({ ...x, state: "done", result: r.data }));
      router.refresh();
    } else set((x) => ({ ...x, state: "open", error: r.error }));
  };
  const cancel = (ti: number, pi: number) => patch(ti, (t) => ({ ...t, proposals: t.proposals.map((x, j) => (j === pi ? { ...x, state: "cancelled" } : x)) }));

  const off = status && !status.enabled;
  const noneLeft = status?.remaining === 0;

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Ask" hideTitle className="sm:max-w-[560px]">
      <div className="flex h-[min(76vh,640px)] flex-col gap-3">
        <div className="flex items-center gap-2.5 pr-12">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-brand">
            <Sparkles aria-hidden size={17} strokeWidth={2.4} />
          </span>
          <h2 className="text-lg font-extrabold tracking-tight">Ask</h2>
          {status?.remaining != null && status.remaining <= 10 && (
            <span className="tabular rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">{status.remaining} left today</span>
          )}
        </div>

        <div ref={scroller} role="log" aria-live="polite" aria-busy={busy} className="no-scrollbar -mx-1 flex flex-1 flex-col gap-5 overflow-y-auto px-1">
          {turns.length === 0 && !off && (
            <div className="flex flex-1 flex-col items-start justify-end gap-2 pb-1">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void ask(s)}
                  disabled={noneLeft}
                  className="min-h-[44px] rounded-full bg-card px-4 text-sm font-bold shadow-soft transition hover:text-primary active:scale-[0.98] disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {off && <p className="m-auto text-sm font-semibold text-muted-foreground">Assistant isn’t available on this server</p>}
          {turns.map((t, i) => (
            <div key={i} className="flex flex-col gap-2.5">
              <div className="max-w-[85%] self-end rounded-[20px] rounded-br-md bg-primary px-4 py-2.5 text-[14.5px] font-semibold text-primary-foreground">{t.question}</div>
              {t.answer && <Answer text={t.answer} />}
              <AnimatePresence>
                {t.status && (
                  <m.div key={t.status} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    <Loader2 aria-hidden size={14} className="animate-spin" />
                    {t.status}
                  </m.div>
                )}
              </AnimatePresence>
              {t.streaming && !t.status && !t.answer && (
                <span aria-label="Thinking" className="flex gap-1 py-1">
                  {[0, 1, 2].map((d) => (
                    <m.span
                      key={d}
                      className="h-1.5 w-1.5 rounded-full bg-primary"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: d * 0.15 }}
                    />
                  ))}
                </span>
              )}
              {t.proposals.map((p, j) => (
                <ProposalCard key={p.id} p={p} onConfirm={() => void confirm(i, j)} onCancel={() => cancel(i, j)} />
              ))}
              {t.error && (
                <p className="text-sm font-semibold text-destructive">
                  {t.error.message}
                  {t.error.hint && <span className="font-medium text-muted-foreground"> {t.error.hint}</span>}
                </p>
              )}
            </div>
          ))}
        </div>

        <form
          className="flex items-end gap-2 rounded-[24px] bg-card p-1.5 shadow-soft ring-primary/40 focus-within:ring-2"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(draft);
          }}
        >
          <label htmlFor="assistant-input" className="sr-only">
            Question
          </label>
          <textarea
            id="assistant-input"
            ref={input}
            rows={1}
            value={draft}
            maxLength={4000}
            disabled={off || noneLeft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void ask(draft);
              }
            }}
            placeholder={noneLeft ? "No questions left today" : "Ask about routers, customers, money…"}
            className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground disabled:opacity-60 [field-sizing:content]"
          />
          {busy ? (
            <Button type="button" size="icon" variant="secondary" aria-label="Stop" onClick={() => abort.current?.abort()}>
              <Square aria-hidden size={14} fill="currentColor" />
            </Button>
          ) : (
            <Button type="submit" size="icon" aria-label="Send" disabled={!draft.trim() || off || noneLeft} className={cn(!draft.trim() && "opacity-60")}>
              <ArrowUp aria-hidden size={18} strokeWidth={2.6} />
            </Button>
          )}
        </form>
      </div>
    </Modal>
  );
}
