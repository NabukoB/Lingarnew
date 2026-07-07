"use client";

import ReactMarkdown from "react-markdown";

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm prose-invert max-w-none prose-headings:text-bot-paper prose-p:text-gray-300 prose-li:text-gray-300 prose-strong:text-bot-paper prose-code:text-bot-accent prose-a:text-bot-accent text-[13px] leading-relaxed">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
