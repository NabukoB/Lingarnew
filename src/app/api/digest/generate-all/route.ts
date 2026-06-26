import { NextRequest, NextResponse } from "next/server";
import { assembleDigest } from "@/lib/ai/digest";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { todaySlug } from "@/lib/utils/date";
import type { Plan } from "@/types";

export const runtime = "nodejs";

// Called by Vercel Cron at 06:00 UTC daily.
// Generates digests for all users who have received emails today.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const date = todaySlug();

  // Find users who have unprocessed or processed emails from today
  const startOfDay = `${date}T00:00:00Z`;
  const { data: activeUsers } = await supabase
    .from("raw_emails")
    .select("user_id")
    .gte("received_at", startOfDay)
    .eq("processed", true);

  const userIds = [...new Set((activeUsers ?? []).map((r) => r.user_id as string))];

  const results: Array<{ user_id: string; status: string; digestId?: string }> = [];

  for (const userId of userIds) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", userId)
        .single();

      if (!profile) continue;

      const { digestId } = await assembleDigest({
        userId,
        date,
        plan: profile.plan as Plan,
      });

      results.push({ user_id: userId, status: "ok", digestId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "error";
      results.push({ user_id: userId, status: "error", digestId: message });
    }
  }

  return NextResponse.json({ date, processed: results.length, results });
}
