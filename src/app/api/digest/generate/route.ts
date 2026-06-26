import { NextRequest, NextResponse } from "next/server";
import { assembleDigest } from "@/lib/ai/digest";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { GenerateDigestRequest, Plan } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Partial<GenerateDigestRequest>;
  const { user_id, date } = body;

  if (!user_id || !date) {
    return NextResponse.json({ error: "Missing user_id or date" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user_id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  try {
    const { digestId } = await assembleDigest({
      userId: user_id,
      date,
      plan: profile.plan as Plan,
    });
    return NextResponse.json({ success: true, digestId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
