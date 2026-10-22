// Assistant types and pure helpers shared by the route handler and the panel.

export type Proposal = {
  id: string;
  kind: "router_sync" | "suspend" | "reactivate" | "payment_match" | "send_stk" | "create_package";
  title: string;
  detail: string;
  target: Record<string, unknown>;
};

export type AssistantEvent =
  | { type: "text"; text: string }
  | { type: "status"; text: string }
  | { type: "proposal"; proposal: Proposal }
  | { type: "done" }
  | { type: "error"; error: { code: string; message: string; hint?: string } };

export type ChatMessage = { role: "user" | "assistant"; text: string };

/**
 * Splits a server-sent-events buffer into complete events. Returns the parsed
 * events and the unfinished tail to keep for the next chunk.
 */
export function parseSSE(buffer: string): { events: AssistantEvent[]; rest: string } {
  const events: AssistantEvent[] = [];
  const parts = buffer.replace(/\r\n/g, "\n").split("\n\n");
  const rest = parts.pop() ?? "";
  for (const part of parts) {
    const data = part
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).replace(/^ /, ""))
      .join("\n");
    if (!data) continue;
    try {
      events.push(JSON.parse(data) as AssistantEvent);
    } catch {
      /* ignore a malformed event rather than break the stream */
    }
  }
  return { events, rest };
}

/** The conversation to send: complete user/assistant pairs, newest last, ending with the question. */
export function historyFor(messages: ChatMessage[], question: string, maxTurns = 20): ChatMessage[] {
  const pairs: ChatMessage[] = [];
  for (let i = 0; i + 1 < messages.length; i += 2) {
    const u = messages[i]!;
    const a = messages[i + 1]!;
    if (u.role === "user" && a.role === "assistant" && u.text.trim() && a.text.trim()) pairs.push(u, a);
  }
  const keep = pairs.slice(-(maxTurns - 1 - ((maxTurns - 1) % 2)));
  return [...keep, { role: "user", text: question }];
}

export type Inline = { text: string; bold: boolean };
export type Block = { kind: "p"; parts: Inline[] } | { kind: "ul" | "ol"; items: Inline[][] };

function inline(s: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), bold: false });
    out.push({ text: m[1]!, bold: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last), bold: false });
  return out;
}

/** A small, safe subset of Markdown: paragraphs, bullet and numbered lists, **bold**. Never HTML. */
export function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: "p", parts: inline(para.join(" ")) });
    para = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const num = /^\d+[.)]\s+(.*)$/.exec(line);
    if (!line) {
      flush();
      continue;
    }
    if (bullet || num) {
      flush();
      const kind = bullet ? "ul" : "ol";
      const item = inline((bullet ?? num)![1]!);
      const prev = blocks[blocks.length - 1];
      if (prev && prev.kind === kind) prev.items.push(item);
      else blocks.push({ kind, items: [item] });
      continue;
    }
    para.push(line.replace(/^#+\s*/, ""));
  }
  flush();
  return blocks;
}
