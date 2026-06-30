import Link from "next/link";
import { Users, Flame, BellRing } from "lucide-react";

export function StatsBar({
  total,
  hot,
  dueFollowUps,
}: {
  total: number;
  hot: number;
  dueFollowUps: number;
}) {
  const Card = ({
    href,
    icon: Icon,
    accent,
    value,
    label,
  }: {
    href?: string;
    icon: typeof Users;
    accent: string;
    value: number;
    label: string;
  }) => {
    const content = (
      <div className="bg-fundiops-card border border-fundiops-border rounded-xl p-3 sm:p-4 flex items-center gap-3 h-full">
        <div className={`shrink-0 ${accent}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-fundiops-text leading-none">{value}</p>
          <p className="text-[11px] text-fundiops-muted truncate">{label}</p>
        </div>
      </div>
    );
    return href ? (
      <Link href={href} className="block">
        {content}
      </Link>
    ) : (
      content
    );
  };

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <Card icon={Users} accent="text-fundiops-accent" value={total} label="Total leads" />
      <Card icon={Flame} accent="text-orange-400" value={hot} label="Hot leads" />
      <Card
        href="/crm/follow-ups"
        icon={BellRing}
        accent={dueFollowUps > 0 ? "text-red-400" : "text-fundiops-muted"}
        value={dueFollowUps}
        label="Follow-ups due"
      />
    </div>
  );
}
