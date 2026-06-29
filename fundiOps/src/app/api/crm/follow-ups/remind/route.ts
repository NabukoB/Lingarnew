import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendFollowUpReminderEmail } from "@/lib/whatsapp/remind-email";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const now = new Date().toISOString();

  const { data: dueFollowUps, error } = await supabase.rpc(
    "get_pending_follow_ups",
    { p_before: now }
  );

  if (error) {
    console.error("Follow-up cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let processed = 0;

  for (const followUp of dueFollowUps ?? []) {
    try {
      const { data: authUser } =
        await supabase.auth.admin.getUserById(followUp.user_id);
      const email = authUser.user?.email;

      const { data: contact } = await supabase
        .from("wa_contacts")
        .select("display_name, phone")
        .eq("id", followUp.contact_id)
        .single();

      if (email) {
        await sendFollowUpReminderEmail({
          to: email,
          contactName: contact?.display_name ?? contact?.phone ?? "Unknown",
          note: followUp.note,
          dueAt: followUp.due_at,
          contactUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://fundiops.vercel.app"}/crm/${followUp.contact_id}`,
        });
      }

      await supabase
        .from("crm_follow_ups")
        .update({ reminder_sent: true, updated_at: now })
        .eq("id", followUp.id);

      processed++;
    } catch (err) {
      console.error("Follow-up remind error for", followUp.id, err);
    }
  }

  return NextResponse.json({ processed });
}
