"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { GhostNote } from "@/components/digest/GhostNote";
import type { SynthesisQueryResponse, GhostNote as GhostNoteType } from "@/types";

export function SynthesisQueryBox() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GhostNoteType[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch("/api/synthesis/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) throw new Error("Query failed");

      const data = (await res.json()) as SynthesisQueryResponse;
      setResults(
        data.notes.map((n) => ({
          ...n,
          user_id: "",
          trigger_insight_id: "",
          related_insight_ids: [],
          included_in_digest: false,
        }))
      );
      setSearched(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What has the Ghost noticed about AI agents? Or venture capital sentiment? Or anything you've been reading about..."
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-lingar-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lingar-accent resize-none"
        />
        <Button type="submit" disabled={loading || !query.trim()}>
          {loading ? (
            <>
              <Spinner className="mr-2" />
              Searching memory...
            </>
          ) : (
            "Ask the Ghost"
          )}
        </Button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {searched && results.length === 0 && !loading && (
        <p className="text-sm text-lingar-ghost">
          The Ghost has nothing on that yet. Keep forwarding newsletters.
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-6">
          <p className="text-xs text-lingar-ghost uppercase tracking-widest">
            {results.length} ghost note{results.length !== 1 ? "s" : ""} found
          </p>
          {results.map((note) => (
            <GhostNote key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
