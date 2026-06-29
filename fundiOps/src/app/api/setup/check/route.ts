import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// GET /api/setup/check?token=<CRON_SECRET>
// Diagnoses owner profile setup and auto-creates the profile row if possible.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const secret = process.env.CRON_SECRET ?? "";
  const authorized =
    secret.length > 0 &&
    token.length === secret.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(secret));
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized — pass ?token=<CRON_SECRET>" }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();

  // List all auth users
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  const authUsers = usersData?.users?.map((u) => ({ id: u.id, email: u.email })) ?? [];

  // List all profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email");

  const configuredOwnerId = process.env.WHATSAPP_OWNER_USER_ID ?? null;

  // Auto-create profile rows for any auth users that don't have one
  const profileIds = new Set((profiles ?? []).map((p: { id: string }) => p.id));
  const created: string[] = [];
  for (const user of authUsers) {
    if (!profileIds.has(user.id)) {
      const { error } = await supabase
        .from("profiles")
        .insert({ id: user.id, email: user.email });
      if (!error) created.push(user.id);
      else console.error("Profile create error for", user.id, error);
    }
  }

  // Re-fetch profiles after any inserts
  const { data: profilesAfter } = await supabase.from("profiles").select("id, email");

  return NextResponse.json({
    configuredOwnerId,
    recommendation: authUsers[0]
      ? `Set WHATSAPP_OWNER_USER_ID=${authUsers[0].id} in Vercel env vars`
      : "No auth users found — log in at /login first",
    authUsers,
    profiles: profilesAfter ?? profiles,
    profilesCreated: created,
    errors: {
      users: usersError?.message ?? null,
      profiles: profilesError?.message ?? null,
    },
  });
}
