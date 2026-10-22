import { describe, expect, it } from "vitest";
import { historyFor, parseSSE, toBlocks } from "./assistant";

describe("parseSSE", () => {
  it("returns complete events and keeps the tail", () => {
    const { events, rest } = parseSSE('data: {"type":"text","text":"Hi"}\n\ndata: {"type":"status","text":"Checking"}\n\ndata: {"type":"do');
    expect(events).toEqual([
      { type: "text", text: "Hi" },
      { type: "status", text: "Checking" },
    ]);
    expect(rest).toBe('data: {"type":"do');
    expect(parseSSE(rest + 'ne"}\n\n').events).toEqual([{ type: "done" }]);
  });
  it("skips comments and malformed data", () => {
    expect(parseSSE(": ping\n\ndata: {oops\n\n").events).toEqual([]);
  });
});

describe("historyFor", () => {
  it("keeps complete pairs and ends with the question", () => {
    const h = historyFor(
      [
        { role: "user", text: "a" },
        { role: "assistant", text: "b" },
        { role: "user", text: "c" },
        { role: "assistant", text: "" }, // failed answer
      ],
      "d",
    );
    expect(h).toEqual([
      { role: "user", text: "a" },
      { role: "assistant", text: "b" },
      { role: "user", text: "d" },
    ]);
  });
  it("caps the length at an odd number of turns", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", text: String(i) }) as const);
    const h = historyFor([...many], "q", 20);
    expect(h).toHaveLength(19);
    expect(h[0]).toEqual({ role: "user", text: "22" });
    expect(h[h.length - 1]).toEqual({ role: "user", text: "q" });
  });
});

describe("toBlocks", () => {
  it("renders paragraphs, lists and bold without HTML", () => {
    expect(toBlocks("**Ruiru Mast** is offline.\n\n- Check power\n- Check <b>fibre</b>\n1. One\n2. Two")).toEqual([
      { kind: "p", parts: [{ text: "Ruiru Mast", bold: true }, { text: " is offline.", bold: false }] },
      { kind: "ul", items: [[{ text: "Check power", bold: false }], [{ text: "Check <b>fibre</b>", bold: false }]] },
      { kind: "ol", items: [[{ text: "One", bold: false }], [{ text: "Two", bold: false }]] },
    ]);
  });
  it("joins wrapped lines and drops heading marks", () => {
    expect(toBlocks("## Today\nKSh 18,420\nso far")).toEqual([{ kind: "p", parts: [{ text: "Today KSh 18,420 so far", bold: false }] }]);
  });
});
