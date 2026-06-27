"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { todaySlug } from "@/lib/utils/date";

type Tab = "paste" | "url" | "pdf";

const LOADING_STEPS = [
  "Ghost is reading…",
  "Extracting insights…",
  "Connecting to your history…",
  "Building your brief…",
];

export default function AddArticlePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("paste");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<{ insights?: number; message?: string; error?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading) { setLoadingStep(0); return; }
    const t1 = setTimeout(() => setLoadingStep(1), 1800);
    const t2 = setTimeout(() => setLoadingStep(2), 3600);
    const t3 = setTimeout(() => setLoadingStep(3), 5500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    let res: Response;

    if (tab === "pdf" && pdfFile) {
      const fd = new FormData();
      fd.append("file", pdfFile);
      if (title) fd.append("title", title);
      if (source) fd.append("source", source);
      res = await fetch("/api/ingest/manual", { method: "POST", body: fd });
    } else {
      res = await fetch("/api/ingest/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || undefined,
          source: source || undefined,
          text: tab === "paste" ? text : undefined,
          url: tab === "url" ? url : undefined,
        }),
      });
    }

    const data = await res.json();
    setResult(data);
    setLoading(false);

    if (res.ok && (data.insights ?? 0) > 0) {
      setTimeout(() => router.push(`/digest/${todaySlug()}`), 1500);
    }
  }

  const canSubmit = !loading && (
    (tab === "paste" && text.trim().length > 0) ||
    (tab === "url" && url.trim().length > 0) ||
    (tab === "pdf" && pdfFile !== null)
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add article</h1>
        <p className="text-[13px] text-lingar-ghost mt-1">
          Paste text, drop a URL, or upload a PDF — the Ghost extracts insights.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-lingar-surface rounded-xl p-1">
        {(["paste", "url", "pdf"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setResult(null); }}
            className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
              tab === t
                ? "bg-lingar-gold text-lingar-dark"
                : "text-lingar-ghost"
            }`}
          >
            {t === "paste" ? "Paste" : t === "url" ? "URL" : "PDF"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-lingar-surface rounded-2xl border border-white/10 p-4 space-y-4">
          {/* Source + Title */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-lingar-ghost block mb-1.5">
                Source
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. TechCrunch"
                className="w-full bg-lingar-surface2 border border-white/10 rounded-xl px-3 py-2.5 text-[14px] text-lingar-paper placeholder-lingar-ghost focus:outline-none focus:ring-2 focus:ring-lingar-gold/40"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-lingar-ghost block mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Headline"
                className="w-full bg-lingar-surface2 border border-white/10 rounded-xl px-3 py-2.5 text-[14px] text-lingar-paper placeholder-lingar-ghost focus:outline-none focus:ring-2 focus:ring-lingar-gold/40"
              />
            </div>
          </div>

          {/* Paste */}
          {tab === "paste" && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-lingar-ghost block mb-1.5">
                Article text <span className="text-red-400">*</span>
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste the full article text here…"
                rows={12}
                style={{ WebkitUserSelect: "text", userSelect: "text" } as React.CSSProperties}
                className="w-full bg-lingar-surface2 border border-white/10 rounded-xl px-3 py-2.5 text-[14px] text-lingar-paper placeholder-lingar-ghost focus:outline-none focus:ring-2 focus:ring-lingar-gold/40 resize-none leading-relaxed"
              />
            </div>
          )}

          {/* URL */}
          {tab === "url" && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-lingar-ghost block mb-1.5">
                Article URL <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full bg-lingar-surface2 border border-white/10 rounded-xl px-3 py-2.5 text-[14px] text-lingar-paper placeholder-lingar-ghost focus:outline-none focus:ring-2 focus:ring-lingar-gold/40"
              />
              <p className="text-[11px] text-lingar-ghost mt-2">
                The Ghost fetches and reads the article automatically.
              </p>
            </div>
          )}

          {/* PDF */}
          {tab === "pdf" && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-lingar-ghost block mb-1.5">
                PDF file <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-lingar-surface2 border border-dashed border-white/20 rounded-xl px-3 py-8 text-center text-lingar-ghost hover:border-lingar-gold/40 transition-colors"
              >
                {pdfFile ? (
                  <div className="space-y-1">
                    <p className="text-lingar-paper font-medium text-[14px]">{pdfFile.name}</p>
                    <p className="text-[12px]">{(pdfFile.size / 1024).toFixed(0)} KB · tap to change</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-2xl">📄</div>
                    <p className="text-[14px]">Tap to select a PDF</p>
                    <p className="text-[12px]">Up to 20 MB</p>
                  </div>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="w-14 h-14 rounded-full bg-lingar-gold/10 border border-lingar-gold/20 flex items-center justify-center animate-pulse">
              <span className="text-2xl">👻</span>
            </div>
            <p className="text-[14px] font-medium text-lingar-paper">{LOADING_STEPS[loadingStep]}</p>
            <div className="flex gap-1.5">
              {LOADING_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                    i === loadingStep ? "bg-lingar-gold" : "bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {result && !loading && (
          <div className={`rounded-2xl px-4 py-3 text-[13px] ${
            result.error
              ? "bg-red-500/10 text-red-400 border border-red-500/20"
              : (result.insights ?? 0) === 0
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          }`}>
            {result.error
              ? `Error: ${result.error}`
              : result.message
              ? result.message
              : `✓ ${result.insights} insight${result.insights !== 1 ? "s" : ""} extracted — redirecting…`}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-lingar-gold text-lingar-dark rounded-2xl py-3.5 text-[15px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? LOADING_STEPS[loadingStep] : "Extract insights"}
        </button>
      </form>
    </div>
  );
}
