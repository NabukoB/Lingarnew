"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { todaySlug } from "@/lib/utils/date";
import { Button } from "@/components/ui/Button";
import { rebuildTodaysDigest } from "@/app/digest/[date]/actions";
import type { Profile } from "@/types";

const SUGGESTED_GOALS = [
  "Launch a startup",
  "Grow as a product manager",
  "Stay ahead in AI/ML",
  "Become a better investor",
  "Build in public",
  "Grow an audience",
];

const SUGGESTED_INTERESTS = [
  "AI & machine learning",
  "Venture capital",
  "Product design",
  "Developer tools",
  "Finance & markets",
  "Marketing & growth",
  "Climate tech",
  "Web3",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRebuilding, startRebuild] = useTransition();
  const [rebuildStatus, setRebuildStatus] = useState<"idle" | "done" | "error">("idle");
  const [rebuildDate, setRebuildDate] = useState<string | null>(null);

  // Setup form state
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [step, setStep] = useState<"setup" | "done">("setup");
  const [displayName, setDisplayName] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newIngestEmail, setNewIngestEmail] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/");
        return;
      }
      // Gate profile view on auth, not on profile row existing
      setAuthEmail(data.user.email ?? "");
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();
      setProfile((profileData as Profile) ?? null);
      setLoading(false);
    });
  }, [router]);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  async function copyEmail(email: string) {
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function toggleGoal(goal: string) {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  }

  function toggleInterest(interest: string) {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    const allGoals = customGoal.trim() ? [...goals, customGoal.trim()] : goals;

    const res = await fetch("/api/profile/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, goals: allGoals, interests }),
    });

    const data = await res.json();

    if (!res.ok) {
      setSaveError(data.error ?? "Something went wrong. Please try again.");
    } else {
      setNewIngestEmail(data.ingestEmail);
      setStep("done");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="pt-16 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-lingar-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  // Returning user who clicked "Set up ingest address" — show setup form before profile view
  if (showSetupForm && step === "setup") {
    return (
      <form onSubmit={async (e) => { await handleSave(e); setShowSetupForm(false); }} className="max-w-md space-y-10 pt-8">
        <div className="flex items-center gap-3 mb-2">
          <button type="button" onClick={() => setShowSetupForm(false)} className="text-lingar-ghost text-sm">← Back</button>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-lingar-ghost mb-2">Set up ingest</p>
          <h1 className="text-2xl font-bold text-lingar-paper">Tell the Ghost what you&apos;re building</h1>
          <p className="text-sm text-gray-300 mt-2">This is how Lingar filters signal from noise.</p>
        </div>
        <div className="space-y-3">
          <label className="text-sm font-medium text-lingar-paper">What are you trying to do?</label>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_GOALS.map((goal) => (
              <button key={goal} type="button" onClick={() => toggleGoal(goal)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${goals.includes(goal) ? "bg-lingar-gold text-lingar-ink border-lingar-gold" : "border-white/20 text-gray-300 hover:border-white/40"}`}>
                {goal}
              </button>
            ))}
          </div>
          <input type="text" value={customGoal} onChange={(e) => setCustomGoal(e.target.value)}
            placeholder="Or describe your goal..."
            className="w-full border border-white/20 rounded-xl px-3 py-2 text-sm bg-lingar-surface2 text-lingar-paper placeholder:text-lingar-ghost focus:outline-none focus:ring-2 focus:ring-lingar-gold" />
        </div>
        <div className="space-y-3">
          <label className="text-sm font-medium text-lingar-paper">What topics are you tracking?</label>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_INTERESTS.map((interest) => (
              <button key={interest} type="button" onClick={() => toggleInterest(interest)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${interests.includes(interest) ? "bg-lingar-gold text-lingar-ink border-lingar-gold" : "border-white/20 text-gray-300 hover:border-white/40"}`}>
                {interest}
              </button>
            ))}
          </div>
        </div>
        <Button type="submit" disabled={saving || (goals.length === 0 && !customGoal.trim())}>
          {saving ? "Saving..." : "Create my ingest address"}
        </Button>
        {saveError && <p className="text-sm text-lingar-red">{saveError}</p>}
      </form>
    );
  }

  // Any authenticated user → show profile view (profile row may be null for users who skipped setup)
  if (authEmail) {
    const ingestEmail = newIngestEmail || profile?.ingest_email;
    return (
      <div className="space-y-6 pt-2">
        {/* Header */}
        <div>
          <p className="text-xs text-lingar-ghost uppercase tracking-widest mb-1">Profile</p>
          <h1 className="text-2xl font-bold text-lingar-paper">
            {profile?.display_name ?? authEmail?.split("@")[0] ?? "Your account"}
          </h1>
          <p className="text-sm text-lingar-ghost mt-1">{profile?.email ?? authEmail}</p>
        </div>

        {/* Ingest email */}
        <div className="bg-lingar-surface rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-lingar-surface2 flex items-center justify-center shrink-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C9A050" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M2 7l10 7 10-7" />
              </svg>
            </div>
            <p className="text-[13px] font-semibold text-lingar-paper">Ingest Address</p>
          </div>
          {ingestEmail ? (
            <>
              <p className="text-[12px] text-gray-300 leading-snug">
                Forward newsletters to this address. The Ghost will process them automatically.
              </p>
              <button
                onClick={() => copyEmail(ingestEmail)}
                className="w-full bg-lingar-dark border border-white/10 rounded-xl px-4 py-3 font-mono text-[12px] text-lingar-paper text-left break-all hover:border-lingar-gold/40 transition-colors"
              >
                {ingestEmail}
              </button>
              <p className="text-[11px] text-lingar-ghost">
                {copied ? "✓ Copied to clipboard" : "Tap to copy"}
              </p>
            </>
          ) : (
            <>
              <p className="text-[12px] text-gray-300 leading-snug">
                Get a personal email address to forward newsletters to. The Ghost will process them automatically.
              </p>
              <button
                onClick={() => setShowSetupForm(true)}
                className="w-full h-10 rounded-xl bg-lingar-gold text-lingar-ink text-sm font-semibold hover:bg-lingar-gold/90 transition-colors"
              >
                Set up ingest address
              </button>
            </>
          )}
        </div>

        {/* Goals */}
        {(profile?.goals?.length ?? 0) > 0 && (
          <div className="bg-lingar-surface rounded-2xl p-4 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-lingar-ghost">Your goals</p>
            <div className="flex flex-wrap gap-2">
              {profile!.goals.map((g) => (
                <span key={g} className="text-[12px] px-3 py-1 rounded-full bg-lingar-surface2 text-gray-300">
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Interests */}
        {(profile?.interests?.length ?? 0) > 0 && (
          <div className="bg-lingar-surface rounded-2xl p-4 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-lingar-ghost">Tracking</p>
            <div className="flex flex-wrap gap-2">
              {profile!.interests.map((i) => (
                <span key={i} className="text-[12px] px-3 py-1 rounded-full bg-lingar-surface2 text-gray-300">
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Plan */}
        {profile?.plan && (
          <div className="bg-lingar-surface rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-lingar-ghost mb-1">Plan</p>
              <p className="text-[13px] font-semibold text-lingar-paper capitalize">{profile.plan}</p>
            </div>
            {profile.plan === "free" && (
              <span className="text-[11px] text-lingar-gold font-medium">Upgrade →</span>
            )}
          </div>
        )}

        {/* Rebuild brief */}
        <div className="bg-lingar-surface rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-lingar-gold/10 flex items-center justify-center text-lg shrink-0">
                👻
              </div>
              <div>
                <p className="text-[13px] font-semibold text-lingar-paper">
                  {isRebuilding ? "Building brief…" : rebuildStatus === "done" ? "Brief rebuilt ✓" : "Rebuild today's brief"}
                </p>
                <p className="text-[11px] text-lingar-ghost mt-0.5">
                  {rebuildStatus === "done" ? "Ghost Notes synced — check your brief" : "Syncs all Ghost Notes into today's digest"}
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                startRebuild(async () => {
                  const result = await rebuildTodaysDigest();
                  if (result?.ok) {
                    setRebuildStatus("done");
                    setRebuildDate(result.date ?? null);
                  } else {
                    setRebuildStatus("error");
                  }
                })
              }
              disabled={isRebuilding || rebuildStatus === "done"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-lingar-gold/10 border border-lingar-gold/30 text-lingar-gold text-[12px] font-semibold shrink-0 disabled:opacity-40 transition-opacity"
            >
              {isRebuilding ? (
                <span className="w-3 h-3 rounded-full border border-lingar-gold border-t-transparent animate-spin" />
              ) : rebuildStatus === "done" ? (
                "✓"
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                    <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                  </svg>
                  Rebuild
                </>
              )}
            </button>
          </div>
          {rebuildStatus === "done" && (
            <button
              onClick={() => router.push(`/digest/${rebuildDate ?? todaySlug()}`)}
              className="mt-3 w-full h-9 rounded-xl bg-lingar-gold text-lingar-dark text-[13px] font-semibold"
            >
              View today's brief →
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="pt-2 space-y-3">
          <Button
            variant="ghost"
            className="w-full justify-start text-lingar-ghost"
            onClick={() => router.push(`/digest/${todaySlug()}`)}
          >
            ← Back to Brief
          </Button>
          <button
            onClick={handleLogout}
            className="w-full h-10 rounded-xl border border-white/10 text-sm text-lingar-ghost hover:text-lingar-red hover:border-lingar-red/40 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // Setup complete (from profile page flow) — show the new ingest email then go back to profile
  if (step === "done" && !showSetupForm && newIngestEmail && authEmail) {
    return (
      <div className="space-y-6 pt-2">
        <div>
          <p className="text-xs text-lingar-ghost uppercase tracking-widest mb-1">Profile</p>
          <h1 className="text-2xl font-bold text-lingar-paper">
            {profile?.display_name ?? authEmail.split("@")[0]}
          </h1>
          <p className="text-sm text-lingar-ghost mt-1">{profile?.email ?? authEmail}</p>
        </div>
        <div className="bg-lingar-surface border border-lingar-gold/30 rounded-2xl p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-lingar-gold">Ingest address created</p>
          <button onClick={() => copyEmail(newIngestEmail)}
            className="w-full bg-lingar-dark border border-white/10 rounded-xl px-4 py-3 font-mono text-[12px] text-lingar-paper text-left break-all hover:border-lingar-gold/40 transition-colors">
            {newIngestEmail}
          </button>
          <p className="text-[11px] text-lingar-ghost">{copied ? "✓ Copied to clipboard" : "Tap to copy"}</p>
          <p className="text-[12px] text-gray-300">Forward newsletters to this address. The Ghost will process them automatically.</p>
        </div>
        <Button onClick={() => router.push(`/digest/${todaySlug()}`)}>Go to today&apos;s digest</Button>
        <button onClick={handleLogout} className="w-full h-10 rounded-xl border border-white/10 text-sm text-lingar-ghost hover:text-lingar-red hover:border-lingar-red/40 transition-colors">Sign out</button>
      </div>
    );
  }

  // New user — setup complete
  if (step === "done") {
    return (
      <div className="max-w-md space-y-8 pt-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-lingar-ghost mb-2">
            You&apos;re set up
          </p>
          <h1 className="text-2xl font-bold text-lingar-paper">Your ingest address</h1>
        </div>

        <div className="border border-lingar-gold/30 rounded-xl px-5 py-4 bg-lingar-surface font-mono text-sm text-lingar-paper">
          {newIngestEmail}
        </div>

        <div className="space-y-2 text-sm text-gray-300">
          <p>Forward newsletters and articles to this address.</p>
          <p>
            Lingar will extract insights, build context, and generate your daily
            brief automatically.
          </p>
          <p className="text-lingar-ghost text-xs">
            The Ghost starts working after your first email arrives.
          </p>
        </div>

        <Button onClick={() => router.push(`/digest/${todaySlug()}`)}>
          Go to today&apos;s digest
        </Button>
      </div>
    );
  }

  // New user — setup form
  return (
    <form onSubmit={handleSave} className="max-w-md space-y-10 pt-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-lingar-ghost mb-2">
          Set up your profile
        </p>
        <h1 className="text-2xl font-bold text-lingar-paper">
          Tell the Ghost what you&apos;re building
        </h1>
        <p className="text-sm text-gray-300 mt-2">
          This is how Lingar filters signal from noise. Be specific.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-lingar-paper">
          Your name (optional)
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="First name"
          className="w-full border border-white/20 rounded-xl px-3 py-2 text-sm bg-lingar-surface2 text-lingar-paper placeholder:text-lingar-ghost focus:outline-none focus:ring-2 focus:ring-lingar-gold"
        />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-lingar-paper">
          What are you trying to do? (pick all that apply)
        </label>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_GOALS.map((goal) => (
            <button
              key={goal}
              type="button"
              onClick={() => toggleGoal(goal)}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                goals.includes(goal)
                  ? "bg-lingar-gold text-lingar-ink border-lingar-gold"
                  : "border-white/20 text-gray-300 hover:border-white/40"
              }`}
            >
              {goal}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={customGoal}
          onChange={(e) => setCustomGoal(e.target.value)}
          placeholder="Or describe your goal..."
          className="w-full border border-white/20 rounded-xl px-3 py-2 text-sm bg-lingar-surface2 text-lingar-paper placeholder:text-lingar-ghost focus:outline-none focus:ring-2 focus:ring-lingar-gold"
        />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-lingar-paper">
          What topics are you tracking?
        </label>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_INTERESTS.map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() => toggleInterest(interest)}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                interests.includes(interest)
                  ? "bg-lingar-gold text-lingar-ink border-lingar-gold"
                  : "border-white/20 text-gray-300 hover:border-white/40"
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        disabled={saving || (goals.length === 0 && !customGoal.trim())}
      >
        {saving ? "Saving..." : "Set up my ingest address"}
      </Button>
      {saveError && <p className="text-sm text-lingar-red">{saveError}</p>}
    </form>
  );
}
