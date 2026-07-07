"use client";

import ReactMarkdown from "react-markdown";

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm prose-invert max-w-none prose-headings:text-lingar-paper prose-p:text-gray-300 prose-li:text-gray-300 prose-strong:text-lingar-paper prose-code:text-lingar-gold prose-a:text-lingar-gold text-[13px] leading-relaxed">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
