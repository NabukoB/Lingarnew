import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const MODEL = "claude-opus-4-8";

function buildSystemPrompt(): string {
  const businessName = process.env.BUSINESS_NAME ?? "our business";
  const businessContext =
    process.env.BUSINESS_CONTEXT ??
    "We are a small business answering customer questions on WhatsApp.";

  return `You are the WhatsApp customer service assistant for ${businessName}.

Business information:
${businessContext}

Reply directly to the customer as if you were a friendly staff member. Rules:
- Keep replies short: 1-3 sentences, WhatsApp-length.
- Match the customer's language (English, Swahili, etc.). Do not translate.
- Answer only from the business information above. If you don't know, say so and offer to have a human follow up.
- Never invent prices, hours, addresses, or promotions that aren't in the business information.
- No markdown, no bullet points, no headings — this is a WhatsApp chat.
- Do not start with "Hi" or "Hello" every time; only greet on the first message of a conversation.`;
}

export async function generateReply(customerMessage: string): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: customerMessage }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  if (!text) {
    return "Sorry, I couldn't process that. A team member will get back to you shortly.";
  }
  return text;
}
