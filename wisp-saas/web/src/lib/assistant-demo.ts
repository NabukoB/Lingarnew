// Canned assistant answers for demo mode (no API), built from the example data.
import type { AssistantEvent } from "./assistant";

type Script = { match: RegExp; steps: AssistantEvent[] };

const scripts: Script[] = [
  {
    match: /offline|down|ruiru|outage/i,
    steps: [
      { type: "status", text: "Checking routers" },
      { type: "status", text: "Reading router history" },
      {
        type: "text",
        text: "**Ruiru Mast** has been offline for 18 minutes. It stopped answering at once, which usually means it lost power or its internet link.\n\n- Check the router's power and the uplink cable\n- If the fibre box shows a red LOS light, call your upstream ISP\n\nThe other 5 routers are fine.",
      },
    ],
  },
  {
    match: /slow|cpu|mwiki|busy/i,
    steps: [
      { type: "status", text: "Checking routers" },
      { type: "status", text: "Reading router history" },
      {
        type: "text",
        text: "**Mwiki Estate B** has been at 94% CPU for the last 20 minutes with 37 users online, so customers there will feel it slow.\n\n- Its last settings push failed, which can leave extra firewall rules running\n- A sync re-applies our settings",
      },
      {
        type: "proposal",
        proposal: { id: "demo-sync", kind: "router_sync", title: "Sync Mwiki Estate B", detail: "Re-apply settings after the failed push.", target: { router_id: "r3" } },
      },
    ],
  },
  {
    match: /unmatched|match|pay(ment)?s?\b|john/i,
    steps: [
      { type: "status", text: "Reading payments" },
      { type: "status", text: "Looking up customers" },
      {
        type: "text",
        text: "One Paybill payment is unmatched: **KSh 1,500** at 14:11 with account “JOHN”. The amount matches **John Kamau · JZM1077**'s Silver plan and his renewal is due.",
      },
      {
        type: "proposal",
        proposal: {
          id: "demo-match",
          kind: "payment_match",
          title: "Credit KSh 1,500 (“JOHN”) to John Kamau · JZM1077",
          detail: "Same amount as his plan, renewal due.",
          target: { payment_id: "p4", account_id: "JZM1077" },
        },
      },
    ],
  },
];

const fallback: AssistantEvent[] = [
  { type: "status", text: "Adding up today" },
  {
    type: "text",
    text: "Today so far: **KSh 18,420** from M-Pesa, up 7% on yesterday.\n\n- 214 people online (281 PPPoE customers)\n- 146 hotspot sales\n- 92% of renewals paid on time\n\nRuiru Mast is offline and Mwiki Estate B is running hot; ask me about either.",
  },
];

/** The demo events for a question, with text split into small chunks. */
export function demoEvents(question: string): AssistantEvent[] {
  const steps = scripts.find((s) => s.match.test(question))?.steps ?? fallback;
  const out: AssistantEvent[] = [];
  for (const s of steps) {
    if (s.type !== "text") {
      out.push(s);
      continue;
    }
    for (const chunk of s.text.match(/\S+\s*|\s+/g) ?? []) out.push({ type: "text", text: chunk });
  }
  out.push({ type: "done" });
  return out;
}
