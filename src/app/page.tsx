import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { todaySlug } from "@/lib/utils/date";
import { AuthForm } from "./AuthForm";

export default async function LandingPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(`/digest/${todaySlug()}`);
  }

  return (
    <div className="space-y-24">
      {/* Hero */}
      <section className="pt-16 space-y-6 max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-lingar-ghost">
          Personal Intelligence OS
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight">
          The digest that
          <br />
          remembers you.
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed">
          Forward your newsletters. Lingar extracts what matters, connects it to
          your history, and surfaces the patterns you&apos;re too busy to see.
        </p>
        <AuthForm />
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <FeatureCard
          label="Extracted Insights"
          description="Not summaries. Filtered intelligence, scored against your specific goals."
        />
        <FeatureCard
          label="Ghost Notes"
          description="AI-generated notes that connect today's reading to what you knew six months ago. Patterns, contradictions, opportunities."
        />
        <FeatureCard
          label="Synthesis Layer"
          description="Query your entire reading history in natural language. Ask what you've learned about any topic."
        />
      </section>

      {/* How it works */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-lingar-ghost">
          How it works
        </h2>
        <ol className="space-y-3">
          {[
            "Get a unique email address — yours@lingar.app",
            "Forward newsletters and articles to it",
            "Lingar extracts insights, builds context, spots patterns",
            "Read your daily brief. Ask the Ghost anything.",
          ].map((step, i) => (
            <li key={i} className="flex gap-4 items-start text-sm text-gray-700">
              <span className="font-mono text-lingar-ghost shrink-0 w-5">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      {/* Pricing */}
      <section className="space-y-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-lingar-ghost">
          Pricing
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PricingCard
            plan="Free"
            price="$0"
            features={["3 insights per day", "Basic web digest", "30-day history"]}
          />
          <PricingCard
            plan="Pro"
            price="$9–12/mo"
            features={[
              "Unlimited insights",
              "Ghost Notes",
              "Source health tracking",
              "Full history",
            ]}
            highlighted
          />
          <PricingCard
            plan="Executive"
            price="$29–49/mo"
            features={[
              "Everything in Pro",
              "Synthesis layer",
              "Knowledge health scores",
              "Team sharing",
            ]}
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <div className="border border-gray-100 rounded-lg p-5 bg-white space-y-2">
      <h3 className="font-semibold text-sm text-lingar-ink">{label}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function PricingCard({
  plan,
  price,
  features,
  highlighted,
}: {
  plan: string;
  price: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-5 space-y-4 border ${
        highlighted
          ? "border-lingar-ink bg-lingar-ink text-lingar-paper"
          : "border-gray-100 bg-white"
      }`}
    >
      <div>
        <p
          className={`text-xs font-semibold uppercase tracking-widest ${
            highlighted ? "text-gray-400" : "text-lingar-ghost"
          }`}
        >
          {plan}
        </p>
        <p className="text-2xl font-bold mt-1">{price}</p>
      </div>
      <ul className="space-y-1.5">
        {features.map((f) => (
          <li
            key={f}
            className={`text-sm ${highlighted ? "text-gray-300" : "text-gray-600"}`}
          >
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
