import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Look up the first profile and use whatever ingest_email is stored.
  // Also fixes the domain if it was saved with the wrong one.
  const service = createSupabaseServiceClient();
  const { data: profiles } = await service
    .from("profiles")
    .select("id, ingest_email")
    .limit(1);

  const profile = profiles?.[0];
  if (!profile) {
    return NextResponse.json({ error: "No profiles found" }, { status: 404 });
  }

  // Fix wrong domain in-place if needed.
  if (profile.ingest_email.includes("lingarnew.vercel.app")) {
    const fixed = profile.ingest_email.replace("lingarnew.vercel.app", "lingar.app");
    await service.from("profiles").update({ ingest_email: fixed }).eq("id", profile.id);
    profile.ingest_email = fixed;
  }

  const body = new FormData();
  body.set("test_mode", process.env.CRON_SECRET!);
  body.set("recipient", profile.ingest_email);
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
  const res = await fetch(ingestUrl.toString(), { method: "POST", body });
  const result = await res.json();

  return NextResponse.json({ status: res.status, recipient: profile.ingest_email, result });
}
