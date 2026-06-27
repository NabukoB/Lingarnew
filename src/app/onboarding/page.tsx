"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { generateIngestEmail } from "@/lib/utils/ingest-email";
import { todaySlug } from "@/lib/utils/date";
import { Button } from "@/components/ui/Button";

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
  const [step, setStep] = useState<"profile" | "done">("profile");
  const [displayName, setDisplayName] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [ingestEmail, setIngestEmail] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/");
    });
  }, [router]);

  function toggleGoal(goal: string) {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  }

  function toggleInterest(interest: string) {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaveError("Session expired. Please sign in again.");
      setSaving(false);
      return;
    }

    const allGoals = customGoal.trim()
      ? [...goals, customGoal.trim()]
      : goals;

    const ingestAddr = generateIngestEmail(user.id);

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? "",
      ingest_email: ingestAddr,
      display_name: displayName.trim() || null,
      goals: allGoals,
      interests,
      plan: "free",
    });

    if (error) {
      setSaveError(error.message);
    } else {
      setIngestEmail(ingestAddr);
      setStep("done");
    }

    setSaving(false);
  }

  if (step === "done") {
    return (
      <div className="max-w-md space-y-8 pt-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-lingar-ghost mb-2">
            You&apos;re set up
          </p>
          <h1 className="text-2xl font-bold">Your ingest address</h1>
        </div>

        <div className="border border-lingar-ink rounded-lg px-5 py-4 bg-lingar-ink text-lingar-paper font-mono text-sm">
          {ingestEmail}
        </div>

        <div className="space-y-2 text-sm text-gray-700">
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

  return (
    <form onSubmit={handleSave} className="max-w-md space-y-10 pt-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-lingar-ghost mb-2">
          Set up your profile
        </p>
        <h1 className="text-2xl font-bold">
          Tell the Ghost what you&apos;re building
        </h1>
        <p className="text-sm text-gray-600 mt-2">
          This is how Lingar filters signal from noise. Be specific.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-lingar-ink">
          Your name (optional)
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="First name"
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lingar-accent"
        />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-lingar-ink">
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
                  ? "bg-lingar-ink text-lingar-paper border-lingar-ink"
                  : "border-gray-200 text-gray-700 hover:border-gray-400"
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
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lingar-accent"
        />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-lingar-ink">
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
                  ? "bg-lingar-ink text-lingar-paper border-lingar-ink"
                  : "border-gray-200 text-gray-700 hover:border-gray-400"
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
      {saveError && (
        <p className="text-sm text-red-600">{saveError}</p>
      )}
    </form>
  );
}
