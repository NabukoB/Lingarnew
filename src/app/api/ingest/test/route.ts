import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// One-tap test trigger — fires a sample newsletter through the full AI pipeline.
// Protected by CRON_SECRET so only you can use it.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipient = req.nextUrl.searchParams.get("recipient");
  if (!recipient) {
    return NextResponse.json({ error: "Missing ?recipient= param" }, { status: 400 });
  }

  const body = new FormData();
  body.set("test_mode", process.env.CRON_SECRET!);
  body.set("recipient", recipient);
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

  return NextResponse.json({ status: res.status, result });
}
