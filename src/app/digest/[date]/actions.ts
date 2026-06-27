"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { assembleDigest } from "@/lib/ai/digest";
import type { Plan } from "@/types";

export async function syncDigestGhostNotes(date: string) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const service = createSupabaseServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  await assembleDigest({
    userId: user.id,
    date,
    plan: (profile?.plan ?? "pro") as Plan,
  });

  revalidatePath(`/digest/${date}`);
}
