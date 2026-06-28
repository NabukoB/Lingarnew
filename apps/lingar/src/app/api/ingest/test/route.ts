import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const debug: Record<string, unknown> = {};

  // Step 1: Look up profile
  const service = createSupabaseServiceClient();
  const { data: profiles, error: profileErr } = await service
    .from("profiles")
    .select("id, ingest_email, plan, goals")
    .limit(1);

  debug.profile_query_error = profileErr?.message ?? null;
  debug.profiles_found = profiles?.length ?? 0;

  const profile = profiles?.[0];
  if (!profile) {
    return NextResponse.json({ error: "No profiles found", debug }, { status: 404 });
  }

  // Step 2: Upgrade plan to pro if still on free
  if (profile.plan === "free") {
    const { error: planErr } = await service
      .from("profiles")
      .update({ plan: "pro" })
      .eq("id", profile.id);
    debug.plan_upgrade = planErr ? `FAILED: ${planErr.message}` : "free → pro";
    profile.plan = "pro";
  } else {
    debug.plan_upgrade = `already ${profile.plan}`;
  }

  // Step 3: Fix wrong domain if needed
  if (profile.ingest_email.includes("lingarnew.vercel.app")) {
    const fixed = profile.ingest_email.replace("lingarnew.vercel.app", "lingar.app");
    const { error: fixErr } = await service
      .from("profiles")
      .update({ ingest_email: fixed })
      .eq("id", profile.id);
    debug.domain_fix = fixErr ? `FAILED: ${fixErr.message}` : `fixed to ${fixed}`;
    profile.ingest_email = fixed;
  }

  debug.recipient = profile.ingest_email;
  debug.plan = profile.plan;
  debug.goals = profile.goals;

  // Step 3: Fire the ingest pipeline
  const body = new FormData();
  body.set("test_mode", process.env.CRON_SECRET!);
  body.set("recipient", profile.ingest_email);
  body.set("sender", "editor@deeplearning.ai");
  body.set("from", "The Batch <editor@deeplearning.ai>");
  body.set("subject", "AI Weekly: The models that matter this week");
  body.set(
    "body-plain",
    `OpenAI released o3 with a 10x jump in reasoning benchmarks, outperforming PhD-level humans on math olympiad problems. The model uses extended chain-of-thought at inference time — compute scales with problem difficulty rather than model size.

Anthropic published research showing that RLHF creates "sycophantic" models that tell users what they want to hear rather than the truth. Their solution: Constitutional AI with adversarial red-teaming built into the training loop.

Google DeepMind's AlphaFold 3 now predicts protein-ligand interactions with 80% accuracy — enough to meaningfully accelerate early-stage drug discovery. Three pharma companies already using it for screening.

Mistral released Mixtral 8x22B open-source, claiming it beats GPT-4 on coding benchmarks while running on a single H100. The mixture-of-experts architecture activates only 39B parameters per token despite having 141B total.

Key trend: frontier labs are converging on inference-time compute scaling as the next axis of improvement after pre-training scaling laws plateau.`
  );

  const ingestUrl = new URL("/api/ingest/email", req.url);
  let pipelineResult: unknown = null;
  let pipelineStatus = 0;

  try {
    const res = await fetch(ingestUrl.toString(), { method: "POST", body });
    pipelineStatus = res.status;
    pipelineResult = await res.json();
  } catch (err) {
    pipelineResult = { fetch_error: err instanceof Error ? err.message : String(err) };
  }

  debug.pipeline_status = pipelineStatus;
  debug.pipeline_result = pipelineResult;

  // Step 4: Count what was created
  const [{ count: insightCount }, { count: ghostCount }] = await Promise.all([
    service.from("insights").select("*", { count: "exact", head: true }).eq("user_id", profile.id),
    service.from("ghost_notes").select("*", { count: "exact", head: true }).eq("user_id", profile.id),
  ]);

  debug.total_insights_in_db = insightCount;
  debug.total_ghost_notes_in_db = ghostCount;

  // Step 5: Backfill ghost notes for all existing insights
  const backfillUrl = new URL("/api/ghost-notes/backfill", req.url);
  let backfillResult: unknown = null;
  try {
    const backfillRes = await fetch(backfillUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ user_id: profile.id }),
    });
    backfillResult = await backfillRes.json();
  } catch (err) {
    backfillResult = { error: err instanceof Error ? err.message : String(err) };
  }
  debug.backfill_result = backfillResult;

  // Step 6: Generate today's digest
  const today = new Date().toISOString().slice(0, 10);
  const digestUrl = new URL("/api/digest/generate", req.url);
  let digestResult: unknown = null;
  try {
    const digestRes = await fetch(digestUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ user_id: profile.id, date: today }),
    });
    digestResult = await digestRes.json();
  } catch (err) {
    digestResult = { error: err instanceof Error ? err.message : String(err) };
  }
  debug.digest_result = digestResult;
  debug.view_digest_at = `/digest/${today}`;

  return NextResponse.json(debug);
}
