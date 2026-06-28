"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }

    setLoading(false);
  }

  if (sent) {
    return (
      <div className="text-sm text-gray-300 border border-white/20 rounded-xl px-4 py-3 bg-lingar-surface">
        Check your inbox — click the link to sign in.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="flex-1 border border-white/20 rounded-xl px-3 py-2 text-sm bg-lingar-surface2 text-lingar-paper placeholder:text-lingar-ghost focus:outline-none focus:ring-2 focus:ring-lingar-gold"
        />
        <Button type="submit" disabled={loading}>
          {loading ? "..." : "Get started"}
        </Button>
      </div>
      {error && <p className="text-xs text-lingar-red">{error}</p>}
    </form>
  );
}
