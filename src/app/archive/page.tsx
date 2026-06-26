import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DigestCard } from "@/components/digest/DigestCard";
import type { Digest } from "@/types";

export default async function ArchivePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: digests } = await supabase
    .from("digests")
    .select("*")
    .eq("user_id", user.id)
    .not("generated_at", "is", null)
    .order("date", { ascending: false })
    .limit(90);

  const typedDigests = (digests ?? []) as Digest[];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs text-lingar-ghost uppercase tracking-widest mb-1">
          Archive
        </p>
        <h1 className="text-2xl font-bold">Past briefs</h1>
      </div>

      {typedDigests.length === 0 ? (
        <p className="text-sm text-gray-600">
          No briefs yet. Forward some newsletters to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {typedDigests.map((digest) => (
            <DigestCard key={digest.id} digest={digest} />
          ))}
        </div>
      )}
    </div>
  );
}
