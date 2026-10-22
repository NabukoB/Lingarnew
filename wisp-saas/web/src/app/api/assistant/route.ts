// Streams the assistant's answer (server-sent events) from the Go API to the
// dashboard. The session token stays server-side.
import { headers } from "next/headers";
import { API_URL, isLive } from "@/lib/backend";
import { demoEvents } from "@/lib/assistant-demo";
import { getToken } from "@/lib/session";

export const dynamic = "force-dynamic";

const fail = (status: number, code: string, message: string, hint?: string) => Response.json({ error: { code, message, hint } }, { status });

const sseHeaders = { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" };

export async function POST(req: Request) {
  // Cookies ride along on same-site requests only; refuse other origins outright.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return fail(403, "FORBIDDEN", "Not allowed from another site.");

  const body = (await req.json().catch(() => null)) as { messages?: { role: string; text: string }[] } | null;
  const messages = Array.isArray(body?.messages) ? body!.messages : [];

  if (!isLive()) {
    const question = messages[messages.length - 1]?.text ?? "";
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for (const e of demoEvents(question)) {
          if (req.signal.aborted) break;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
          await new Promise((r) => setTimeout(r, e.type === "text" ? 22 : 420));
        }
        controller.close();
      },
    });
    return new Response(stream, { headers: sseHeaders });
  }

  const token = getToken();
  if (!token) return fail(401, "UNAUTHORIZED", "You are not signed in.", "Sign in again.");
  const forwarded = headers().get("x-forwarded-for");
  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/v1/assistant/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(forwarded ? { "X-Forwarded-For": forwarded } : {}),
      },
      body: JSON.stringify({ messages }),
      signal: req.signal,
      cache: "no-store",
    });
  } catch {
    return fail(503, "API_UNREACHABLE", "Can't reach the server.", "Check your connection and try again.");
  }
  const type = upstream.headers.get("content-type") ?? "application/json";
  return new Response(upstream.body, { status: upstream.status, headers: type.startsWith("text/event-stream") ? sseHeaders : { "Content-Type": type } });
}
