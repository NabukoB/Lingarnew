// Sample/preview data — illustrates the pipeline's output shape.
// In production this is replaced by live queries against facebook_posts,
// facebook_analytics, and facebook_topics/facebook_sources in Supabase.

export type Slot = "construction_tip" | "material_prices" | "project_showcase";

export interface DemoPost {
  slot: Slot;
  label: string;
  time: string;
  status: "posted" | "scheduled";
  title: string;
  content: string;
  hashtags: string[];
  reach: number;
  reactions: number;
  comments: number;
  shares: number;
  engagementRate: number;
  seriesColor: string;
}

export const posts: DemoPost[] = [
  {
    slot: "construction_tip",
    label: "Construction Tip",
    time: "08:00",
    status: "posted",
    title: "Why concrete slabs crack early — and the 7-day fix",
    content:
      "Ever wondered why some concrete slabs crack within a year while others last decades? The secret isn't the mix — it's the cure. Skipping proper curing (keeping concrete moist for at least 7 days) is the #1 reason slabs fail early in our climate. A simple daily water spray or damp sacking can double your slab's lifespan. Next time you pour a foundation or driveway, budget an extra week for curing before you build on it — it's the cheapest insurance your project will ever get. Need a fundi who does it right the first time? Drop us a message.",
    hashtags: ["#ConstructionTips", "#FundiOps", "#BuildRight", "#ConcreteCuring", "#Kenya"],
    reach: 8200,
    reactions: 310,
    comments: 42,
    shares: 18,
    engagementRate: 5.2,
    seriesColor: "series1",
  },
  {
    slot: "material_prices",
    label: "Material Prices",
    time: "13:00",
    status: "posted",
    title: "Sand prices up 12% this week — lock in your supplier now",
    content:
      "Cement prices held steady this week at KES 750-780/50kg bag, but river sand jumped nearly 12% due to tighter quarry regulations — now averaging KES 3,200/tonne, up from KES 2,850. If you're planning a build in the next month, lock in your sand supplier before prices climb further. Steel (Y12 deformed bars) stayed flat at KES 115/kg. Bottom line: budget an extra 10% buffer for sand-heavy work like plastering and flooring this quarter. Want a live materials quote for your project? Message us today.",
    hashtags: ["#MaterialPrices", "#ConstructionKenya", "#FundiOps", "#BuildSmart", "#CementPrices"],
    reach: 4100,
    reactions: 96,
    comments: 15,
    shares: 9,
    engagementRate: 3.1,
    seriesColor: "series2",
  },
  {
    slot: "project_showcase",
    label: "Project Showcase",
    time: "18:30",
    status: "posted",
    title: "From bare plot to family home in 14 weeks",
    content:
      "From a bare plot to a family's dream home in 14 weeks — here's our latest 3-bedroom bungalow build. The standout detail? A hand-laid natural stone facade that took our masons 6 extra days but turned a standard elevation into a statement. Small craftsmanship choices like this are what separate a house from a home. Thinking about your own build? We'd love to bring the same attention to detail to your project.",
    hashtags: ["#ProjectShowcase", "#FundiOps", "#Craftsmanship", "#DreamHome"],
    reach: 11600,
    reactions: 540,
    comments: 63,
    shares: 47,
    engagementRate: 6.4,
    seriesColor: "series3",
  },
];

export const stats = {
  postsPublished: 21,
  avgEngagementRate: 4.9,
  totalReach: 23900,
};

export interface DemoSource {
  publisher: string;
  reliability: "high" | "medium" | "low";
  note: string;
}

export const researchLog = {
  date: "2026-07-14",
  bySlot: [
    {
      slot: "construction_tip" as Slot,
      approvedTitle: "Why concrete slabs crack early — and the 7-day fix",
      sources: [
        { publisher: "Kenya Bureau of Standards", reliability: "high", note: "Concrete curing standard KS 03-2018" },
        { publisher: "Concrete Society (industry body)", reliability: "high", note: "Curing duration vs. compressive strength data" },
      ] as DemoSource[],
    },
    {
      slot: "material_prices" as Slot,
      approvedTitle: "Sand prices up 12% this week — lock in your supplier now",
      sources: [
        { publisher: "Nairobi Building Materials Index", reliability: "medium", note: "Weekly price survey, 6 suppliers" },
        { publisher: "National Construction Authority bulletin", reliability: "high", note: "Quarry regulation update" },
      ] as DemoSource[],
    },
    {
      slot: "project_showcase" as Slot,
      approvedTitle: "From bare plot to family home in 14 weeks",
      sources: [
        { publisher: "Internal project record", reliability: "high", note: "Site log + client sign-off, Ruiru build" },
      ] as DemoSource[],
    },
  ],
};

export const pipeline = [
  { stage: "Research", detail: "WebSearch + verify 2+ sources" },
  { stage: "Generate", detail: "Claude drafts per content rules" },
  { stage: "Publish", detail: "Facebook Graph API" },
  { stage: "Analyze", detail: "Insights → Supabase" },
];
