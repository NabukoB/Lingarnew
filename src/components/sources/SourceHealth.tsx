"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Source } from "@/types";

interface SourceHealthProps {
  userId: string;
}

export function SourceHealth({ userId }: SourceHealthProps) {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("sources")
      .select("*")
      .eq("user_id", userId)
      .order("send_count", { ascending: false })
      .then(({ data }) => {
        setSources((data ?? []) as Source[]);
        setLoading(false);
      });
  }, [userId]);

  if (loading || sources.length === 0) return null;

  const flagged = sources.filter(
    (s) => s.unsubscribe_suggested || (s.send_count >= 5 && signalRatio(s) < 0.2)
  );

  return (
    <section className="mt-8 pt-6 border-t border-white/10">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-lingar-ghost mb-4">
        Source Health
      </h2>

      <div className="space-y-3">
        {sources.map((source) => {
          const ratio = signalRatio(source);
          const shouldFlag = source.unsubscribe_suggested || (source.send_count >= 5 && ratio < 0.2);
          return (
            <div key={source.id} className="flex items-center gap-4 text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-lingar-paper truncate">
                  {source.from_name ?? source.from_email}
                </p>
                <p className="text-xs text-lingar-ghost truncate">{source.from_email}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="w-20 h-1.5 bg-lingar-surface2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.round(ratio * 100)}%`,
                      backgroundColor: ratio >= 0.5 ? "#10B981" : ratio >= 0.2 ? "#F59E0B" : "#EF4444",
                    }}
                  />
                </div>
                <span className="text-xs text-lingar-ghost w-8 text-right">
                  {Math.round(ratio * 100)}%
                </span>
              </div>

              {shouldFlag && (
                <span className="text-xs text-lingar-amber font-medium shrink-0">
                  Low signal
                </span>
              )}
            </div>
          );
        })}
      </div>

      {flagged.length > 0 && (
        <p className="mt-4 text-xs text-lingar-ghost">
          {flagged.length} source{flagged.length !== 1 ? "s" : ""} below 20% signal rate.
          The Ghost suggests cleaning your information diet.
        </p>
      )}
    </section>
  );
}

function signalRatio(source: Source): number {
  if (source.send_count === 0) return 1;
  return Math.min(source.useful_count / source.send_count, 1);
}
