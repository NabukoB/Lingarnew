import { posts, stats, researchLog, pipeline, type DemoPost } from "@/lib/demo-data";

export const dynamic = "force-static";

const fmtNum = (n: number) => n.toLocaleString();

export default function DashboardPage() {
  const maxRate = Math.max(...posts.map((p) => p.engagementRate));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] text-fb-accent uppercase tracking-widest font-medium">
            FundiOps
          </p>
          <h1 className="text-2xl font-bold text-fb-paper mt-1">
            Facebook Content Agent
          </h1>
          <p className="text-xs text-fb-muted mt-1 max-w-md">
            Autonomous research, drafting, scheduling, and analytics for a
            Facebook Page — built on Claude Code cloud routines.
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-fb-amber border border-fb-amber/40 rounded-full px-2.5 py-1">
          Preview · sample data
        </span>
      </div>

      <Section title="Pipeline">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {pipeline.map((step, i) => (
            <div
              key={step.stage}
              className="bg-fb-surface2 rounded-xl border border-fb-border px-3 py-2.5"
            >
              <p className="text-[9px] text-fb-muted uppercase tracking-wider">
                {i + 1}
              </p>
              <p className="text-xs font-semibold text-fb-paper mt-0.5">
                {step.stage}
              </p>
              <p className="text-[10px] text-fb-muted mt-0.5 leading-tight">
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Posts Published" value={String(stats.postsPublished)} />
        <StatTile
          label="Avg Engagement"
          value={`${stats.avgEngagementRate.toFixed(1)}%`}
        />
        <StatTile label="Total Reach" value={fmtNum(stats.totalReach)} />
      </div>

      <Section title="Engagement Rate by Slot" subtitle="last 30 days">
        <div className="space-y-3">
          {posts.map((p) => (
            <EngagementBar key={p.slot} post={p} maxRate={maxRate} />
          ))}
        </div>
      </Section>

      <Section title="Today's Schedule">
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-fb-muted text-[10px] uppercase tracking-wider">
                <th className="py-1 px-1 font-medium">Time</th>
                <th className="py-1 px-1 font-medium">Slot</th>
                <th className="py-1 px-1 font-medium">Topic</th>
                <th className="py-1 px-1 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.slot} className="border-t border-fb-border">
                  <td className="py-2 px-1 text-fb-muted tabular-nums">
                    {p.time}
                  </td>
                  <td className="py-2 px-1 font-semibold text-fb-paper">
                    {p.label}
                  </td>
                  <td className="py-2 px-1 text-gray-300">{p.title}</td>
                  <td className="py-2 px-1 text-right">
                    <StatusPill status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Sample Generated Posts">
        <div className="space-y-4">
          {posts.map((p) => (
            <PostCard key={p.slot} post={p} />
          ))}
        </div>
      </Section>

      <Section
        title="Research Log"
        subtitle={researchLog.date}
      >
        <div className="space-y-3">
          {researchLog.bySlot.map((entry) => (
            <div key={entry.slot}>
              <p className="text-xs font-semibold text-fb-paper">
                {entry.approvedTitle}
              </p>
              <ul className="mt-1 space-y-1">
                {entry.sources.map((s, i) => (
                  <li
                    key={i}
                    className="text-[11px] text-fb-muted flex items-center gap-2"
                  >
                    <ReliabilityDot reliability={s.reliability} />
                    <span className="text-gray-300">{s.publisher}</span>
                    <span>— {s.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <div className="text-center text-[11px] text-fb-muted pt-4 border-t border-fb-border space-y-1">
        <p>
          Sample data for demonstration. In production this reads live from
          the Facebook Graph API and Supabase.
        </p>
        <p>
          <a
            href="https://github.com/NabukoB/Lingarnew/tree/main/facebook-agent"
            target="_blank"
            rel="noreferrer"
            className="text-fb-accent underline"
          >
            Source
          </a>{" "}
          ·{" "}
          <a
            href="https://github.com/NabukoB/Lingarnew/tree/main/facebook-agent/memory"
            target="_blank"
            rel="noreferrer"
            className="text-fb-accent underline"
          >
            Memory
          </a>
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-fb-surface rounded-2xl p-5 border border-fb-border">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold text-fb-paper uppercase tracking-wider">
          {title}
        </h2>
        {subtitle && (
          <span className="text-[11px] text-fb-muted">{subtitle}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-fb-surface rounded-2xl p-4 border border-fb-border text-center">
      <p className="text-[9px] text-fb-muted uppercase tracking-wider">
        {label}
      </p>
      <p className="text-xl font-bold text-fb-paper mt-1 tabular-nums">
        {value}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: DemoPost["status"] }) {
  const isPosted = status === "posted";
  return (
    <span
      className={`text-[9px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 ${
        isPosted
          ? "text-fb-green border border-fb-green/40"
          : "text-fb-amber border border-fb-amber/40"
      }`}
    >
      {status}
    </span>
  );
}

function ReliabilityDot({
  reliability,
}: {
  reliability: "high" | "medium" | "low";
}) {
  const color =
    reliability === "high"
      ? "bg-fb-green"
      : reliability === "medium"
        ? "bg-fb-amber"
        : "bg-fb-red";
  return (
    <span
      title={`${reliability} reliability`}
      className={`inline-block w-1.5 h-1.5 rounded-full ${color} shrink-0`}
    />
  );
}

const seriesColorClass: Record<string, string> = {
  series1: "bg-fb-series1",
  series2: "bg-fb-series2",
  series3: "bg-fb-series3",
};

function EngagementBar({
  post,
  maxRate,
}: {
  post: DemoPost;
  maxRate: number;
}) {
  const widthPct = Math.max(6, (post.engagementRate / maxRate) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px] text-gray-300">{post.label}</span>
        <span className="text-[11px] font-semibold text-fb-paper tabular-nums">
          {post.engagementRate.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-fb-surface2 overflow-hidden">
        <div
          title={`${post.label}: ${post.engagementRate.toFixed(1)}% engagement`}
          className={`h-full rounded-full ${seriesColorClass[post.seriesColor]}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

function PostCard({ post }: { post: DemoPost }) {
  return (
    <div className="bg-fb-surface2 rounded-xl border border-fb-border p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${seriesColorClass[post.seriesColor]}`}
          />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-fb-muted">
            {post.label} · {post.time}
          </span>
        </div>
        <StatusPill status={post.status} />
      </div>
      <p className="text-sm text-gray-100 leading-relaxed">{post.content}</p>
      <p className="text-xs text-fb-accent mt-2">{post.hashtags.join(" ")}</p>
      <div className="flex gap-4 mt-3 text-[11px] text-fb-muted tabular-nums">
        <span>{post.reach.toLocaleString()} reach</span>
        <span>{post.reactions} reactions</span>
        <span>{post.comments} comments</span>
        <span>{post.shares} shares</span>
      </div>
    </div>
  );
}
