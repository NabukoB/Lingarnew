import OpenAI from "openai";
import type { CrmAnalysis, WaMessage } from "@/types/crm";

export interface CrmAgentParams {
  messages: Array<Pick<WaMessage, "direction" | "body" | "received_at">>;
  existingContact?: {
    display_name: string | null;
    business_name: string | null;
    interest_summary: string | null;
    current_stage: string;
  } | null;
}

const SYSTEM_PROMPT = `You are a CRM intelligence agent analyzing WhatsApp business conversations.
Classify the conversation and extract actionable CRM data.

Respond ONLY with valid JSON matching this exact shape:
{
  "conv_type": "new_lead" | "existing_customer" | "support" | "spam" | "unknown",
  "contact_name": string | null,
  "business_name": string | null,
  "email": string | null,
  "interest_summary": string,
  "urgency": "low" | "medium" | "high",
  "tags": string[],
  "lead_stage": "new" | "contacted" | "warm" | "hot" | "closed_won" | "closed_lost",
  "ai_summary": string,
  "ai_next_action": string,
  "follow_up_hours": number,
  "follow_up_note": string | null,
  "auto_reply_message": string | null
}

Stage guidance:
- new: first contact, no meaningful exchange yet
- contacted: replied but no product interest confirmed
- warm: clear interest, exploring options
- hot: actively asking for pricing/demo/purchase
- closed_won / closed_lost: deal concluded

Rules:
- tags: 2-5 lowercase tags describing the conversation topic
- follow_up_hours: 0 if no follow-up needed; otherwise hours from now (e.g. 24, 48, 72)
- auto_reply_message: suggest ONLY for the very first inbound from a genuinely new lead; null for all other cases; max 100 words
- spam: marketing bots, irrelevant solicitations — set follow_up_hours to 0, auto_reply_message to null`;

const VALID_CONV_TYPES = new Set(["new_lead", "existing_customer", "support", "spam", "unknown"]);
const VALID_STAGES = new Set(["new", "contacted", "warm", "hot", "closed_won", "closed_lost"]);
const VALID_URGENCY = new Set(["low", "medium", "high"]);

function validateAnalysis(raw: Record<string, unknown>): CrmAnalysis {
  return {
    conv_type: typeof raw.conv_type === "string" && VALID_CONV_TYPES.has(raw.conv_type)
      ? (raw.conv_type as CrmAnalysis["conv_type"])
      : "unknown",
    contact_name: typeof raw.contact_name === "string" ? raw.contact_name : null,
    business_name: typeof raw.business_name === "string" ? raw.business_name : null,
    email: typeof raw.email === "string" ? raw.email : null,
    interest_summary: typeof raw.interest_summary === "string" ? raw.interest_summary : "",
    urgency: typeof raw.urgency === "string" && VALID_URGENCY.has(raw.urgency)
      ? (raw.urgency as CrmAnalysis["urgency"])
      : null,
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((t): t is string => typeof t === "string")
      : [],
    lead_stage: typeof raw.lead_stage === "string" && VALID_STAGES.has(raw.lead_stage)
      ? (raw.lead_stage as CrmAnalysis["lead_stage"])
      : null,
    ai_summary: typeof raw.ai_summary === "string" ? raw.ai_summary : "",
    ai_next_action: typeof raw.ai_next_action === "string" ? raw.ai_next_action : "",
    follow_up_hours:
      typeof raw.follow_up_hours === "number" && isFinite(raw.follow_up_hours)
        ? raw.follow_up_hours
        : 0,
    follow_up_note: typeof raw.follow_up_note === "string" ? raw.follow_up_note : null,
    auto_reply_message:
      typeof raw.auto_reply_message === "string"
        ? raw.auto_reply_message.slice(0, 500)
        : null,
  };
}

export async function runCrmAgent(params: CrmAgentParams): Promise<CrmAnalysis> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { messages, existingContact } = params;

  const transcript = messages
    .slice(-20)
    .map((m) => `[${m.direction === "inbound" ? "Contact" : "You"}]: ${m.body}`)
    .join("\n");

  const contextBlock = existingContact
    ? `Known contact: name=${existingContact.display_name ?? "?"}, business=${existingContact.business_name ?? "?"}, current stage=${existingContact.current_stage}`
    : "This appears to be a new, first-time contact.";

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `${contextBlock}\n\nWhatsApp conversation:\n\n${transcript}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 1024,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  return validateAnalysis(parsed);
}
