import { NextRequest, NextResponse } from "next/server";
import { assembleDigest } from "@/lib/ai/digest";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendDigestEmail } from "@/lib/mailgun/send";
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

      // Send morning email (non-fatal)
      try {
        const [authUserRes, digestRes, profileFullRes] = await Promise.all([
          supabase.auth.admin.getUserById(userId),
          supabase.from("digests").select("headline, insight_ids, ghost_note_ids").eq("id", digestId).single(),
          supabase.from("profiles").select("display_name").eq("id", userId).single(),
        ]);

        const email = authUserRes.data.user?.email;
        const digest = digestRes.data;
        if (email && digest?.headline) {
          let featuredTitle: string | undefined;
          let featuredBody: string | undefined;
          if (digest.ghost_note_ids?.length) {
            const { data: topNote } = await supabase
              .from("ghost_notes")
              .select("title, body")
              .in("id", digest.ghost_note_ids)
              .neq("note_type", "contradiction")
              .order("confidence_score", { ascending: false })
              .limit(1)
              .single();
            featuredTitle = topNote?.title ?? undefined;
            featuredBody = topNote?.body ?? undefined;
          }
          await sendDigestEmail({
            to: email,
            toName: profileFullRes.data?.display_name ?? null,
            headline: digest.headline,
            insightCount: (digest.insight_ids as string[] | null)?.length ?? 0,
            featuredNoteTitle: featuredTitle,
            featuredNoteBody: featuredBody,
            digestUrl: `${process.env.NEXT_PUBLIC_APP_URL}/digest/${date}`,
          });
        }
      } catch { /* non-fatal — digest generation succeeds regardless */ }

      results.push({ user_id: userId, status: "ok", digestId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "error";
      results.push({ user_id: userId, status: "error", digestId: message });
    }
  }

  return NextResponse.json({ date, processed: results.length, results });
}
