"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { todaySlug } from "@/lib/utils/date";
import { Button } from "@/components/ui/Button";
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Setup form state
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

  // Returning user — show profile summary with ingest email + logout
  if (profile?.ingest_email) {
    const ingestEmail = newIngestEmail || profile.ingest_email;
    return (
      <div className="space-y-6 pt-2">
        {/* Header */}
        <div>
          <p className="text-xs text-lingar-ghost uppercase tracking-widest mb-1">Profile</p>
          <h1 className="text-2xl font-bold text-lingar-paper">
            {profile.display_name ?? "Your account"}
          </h1>
          <p className="text-sm text-lingar-ghost mt-1">{profile.email}</p>
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
        </div>

        {/* Goals */}
        {profile.goals?.length > 0 && (
          <div className="bg-lingar-surface rounded-2xl p-4 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-lingar-ghost">Your goals</p>
            <div className="flex flex-wrap gap-2">
              {profile.goals.map((g) => (
                <span key={g} className="text-[12px] px-3 py-1 rounded-full bg-lingar-surface2 text-gray-300">
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Interests */}
        {profile.interests?.length > 0 && (
          <div className="bg-lingar-surface rounded-2xl p-4 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-lingar-ghost">Tracking</p>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((i) => (
                <span key={i} className="text-[12px] px-3 py-1 rounded-full bg-lingar-surface2 text-gray-300">
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Plan */}
        <div className="bg-lingar-surface rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-lingar-ghost mb-1">Plan</p>
            <p className="text-[13px] font-semibold text-lingar-paper capitalize">{profile.plan}</p>
          </div>
          {profile.plan === "free" && (
            <span className="text-[11px] text-lingar-gold font-medium">Upgrade →</span>
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
