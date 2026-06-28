import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SynthesisQueryBox } from "@/components/synthesis/SynthesisQueryBox";

export default async function SynthesisPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (profile?.plan === "free") {
    return (
      <div className="pt-8 space-y-4 max-w-md">
        <p className="text-xs text-lingar-ghost uppercase tracking-widest">Ask the Ghost</p>
        <h1 className="text-2xl font-bold text-lingar-paper">Synthesis Layer</h1>
        <p className="text-sm text-gray-300 leading-relaxed">
          The Synthesis Layer lets you query everything the Ghost has ever noticed
          about your reading history. Ask it what it knows about AI agents,
          venture capital trends, or anything you&apos;ve been tracking.
        </p>
        <p className="text-sm font-medium text-lingar-gold">
          Available on Pro and Executive plans.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs text-lingar-ghost uppercase tracking-widest mb-1">Ask the Ghost</p>
        <h1 className="text-2xl font-bold text-lingar-paper">Synthesis Layer</h1>
        <p className="text-sm text-gray-300 mt-2">
          Query everything the Ghost has noticed across your entire reading history.
        </p>
      </div>

      <Suspense fallback={null}>
        <SynthesisQueryBox />
      </Suspense>
    </div>
  );
}
