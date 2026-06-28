"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { assembleDigest } from "@/lib/ai/digest";
import type { Plan } from "@/types";

async function rebuildDigest(userId: string, date: string, plan: Plan) {
  const service = createSupabaseServiceClient();
  await assembleDigest({ userId, date, plan });
  // Ensure the rebuilt digest is fresh for all users of the service client
  await service.from("digests").select("id").eq("user_id", userId).eq("date", date).single();
  revalidatePath(`/digest/${date}`);
}

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

  await rebuildDigest(user.id, date, (profile?.plan ?? "pro") as Plan);
}

export async function rebuildTodaysDigest() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const service = createSupabaseServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const today = new Date().toISOString().slice(0, 10);
  await rebuildDigest(user.id, today, (profile?.plan ?? "pro") as Plan);
  return { ok: true, date: today };
}
