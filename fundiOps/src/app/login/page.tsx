"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { MessageSquare } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createSupabaseBrowserClient();

  async function signIn() {
    if (!email.trim()) return;
    setLoading(true);
    await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <MessageSquare size={24} className="text-fundiops-accent" />
          <span className="text-xl font-bold text-fundiops-text">
            fundi<span className="text-fundiops-accent">Ops</span>
          </span>
        </div>

        {sent ? (
          <div className="text-center bg-fundiops-card border border-fundiops-border rounded-2xl p-8">
            <p className="text-fundiops-text font-medium mb-2">Check your email</p>
            <p className="text-sm text-fundiops-muted">
              We sent a magic link to <strong>{email}</strong>
            </p>
          </div>
        ) : (
          <div className="bg-fundiops-card border border-fundiops-border rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-sm text-fundiops-text mb-1.5">
                Email address
              </label>
              <input
                type="email"
                className="w-full bg-fundiops-bg border border-fundiops-border rounded-xl px-3 py-2 text-sm text-fundiops-text placeholder:text-fundiops-muted focus:outline-none focus:border-fundiops-accent/50"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && signIn()}
              />
            </div>
            <button
              onClick={signIn}
              disabled={loading || !email.trim()}
              className="w-full py-2.5 bg-fundiops-accent text-black font-medium rounded-xl hover:bg-fundiops-accent-muted hover:text-white transition-colors disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send magic link"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
