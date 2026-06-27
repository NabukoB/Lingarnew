"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { todaySlug } from "@/lib/utils/date";

export default function AddArticlePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ insights?: number; message?: string; error?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/ingest/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, source, text }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);

    if (res.ok && data.insights > 0) {
      setTimeout(() => router.push(`/digest/${todaySlug()}`), 1500);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add article</h1>
        <p className="text-[13px] text-lingar-ghost mt-1">
          Paste any article text and the Ghost will extract insights.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-lingar-ghost block mb-1.5">
              Source (optional)
            </label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. The Batch, TechCrunch"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-lingar-accent/30"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-lingar-ghost block mb-1.5">
              Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article headline"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-lingar-accent/30"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-lingar-ghost block mb-1.5">
              Article text <span className="text-red-400">*</span>
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the full article text here..."
              required
              rows={10}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-lingar-accent/30 resize-none leading-relaxed"
            />
          </div>
        </div>

        {result && (
          <div className={`rounded-2xl px-4 py-3 text-[13px] ${result.error ? "bg-red-50 text-red-600" : result.insights === 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
            {result.error
              ? `Error: ${result.error}`
              : result.message
              ? result.message
              : `✓ ${result.insights} insight${result.insights !== 1 ? "s" : ""} extracted — redirecting to your digest…`}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="w-full bg-lingar-accent text-white rounded-2xl py-3.5 text-[15px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Extracting insights…" : "Extract insights"}
        </button>
      </form>
    </div>
  );
}
