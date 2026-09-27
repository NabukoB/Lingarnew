// Small domain pieces shared by screens: status pills, delta chips, icon tiles.
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDelta } from "@/lib/format";
import type { RouterStatus, SubscriberStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const tones = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-100 text-green-600",
  orange: "bg-orange-100 text-orange-600",
  violet: "bg-violet-100 text-violet-600",
  red: "bg-red-100 text-red-600",
  amber: "bg-amber-100 text-amber-700",
} as const;

export type Tone = keyof typeof tones;

export function IconBox({ icon: Icon, tone, size = "md" }: { icon: LucideIcon; tone: Tone; size?: "md" | "lg" }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center", size === "lg" ? "h-[54px] w-[54px] rounded-[18px]" : "h-10 w-10 rounded-[14px]", tones[tone])}>
      <Icon aria-hidden size={size === "lg" ? 22 : 18} strokeWidth={2.2} />
    </span>
  );
}

export function DeltaChip({ pct, decimals = 0, onDark = false }: { pct: number; decimals?: number; onDark?: boolean }) {
  return <Badge variant={onDark ? "onDark" : pct >= 0 ? "success" : "danger"}>{formatDelta(pct, decimals)}</Badge>;
}

const routerStatus: Record<RouterStatus, { label: string; variant: "success" | "warning" | "danger" | "muted"; dot: string }> = {
  online: { label: "Online", variant: "success", dot: "bg-green-600" },
  slow: { label: "Slow", variant: "warning", dot: "bg-amber-500" },
  offline: { label: "Offline", variant: "danger", dot: "bg-red-500" },
  pending: { label: "Setup", variant: "muted", dot: "bg-slate-400" },
};

export function RouterStatusDot({ status }: { status: RouterStatus }) {
  return (
    <span aria-hidden className="relative flex h-2.5 w-2.5 shrink-0">
      {status === "offline" && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60 motion-reduce:hidden" />}
      <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", routerStatus[status].dot)} />
    </span>
  );
}

export function RouterStatusPill({ status }: { status: RouterStatus }) {
  const s = routerStatus[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

const subStatus: Record<SubscriberStatus, { label: string; variant: "success" | "warning" | "danger" | "muted" }> = {
  active: { label: "Active", variant: "success" },
  grace: { label: "In grace", variant: "warning" },
  expired: { label: "Expired", variant: "warning" },
  suspended: { label: "Suspended", variant: "danger" },
  cancelled: { label: "Cancelled", variant: "muted" },
};

export function SubscriberStatusPill({ status }: { status: SubscriberStatus }) {
  const s = subStatus[status];
  return (
    <Badge variant={s.variant} className="text-xs font-bold">
      {s.label}
    </Badge>
  );
}

export const subscriberStatusLabel = (s: SubscriberStatus) => subStatus[s].label;

export function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Page title row: title, optional chips, actions on the right. */
export function PageHeader({ title, children, actions }: { title: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="flex min-h-[52px] flex-wrap items-center gap-3">
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      {children}
      {actions && <div className="ml-auto flex items-center gap-2.5">{actions}</div>}
    </header>
  );
}

/** Centered empty state: icon, one line, optional action. */
export function EmptyState({ icon: Icon, title, action }: { icon: LucideIcon; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-accent text-primary">
        <Icon aria-hidden className="h-6 w-6" />
      </span>
      <span className="text-sm font-bold text-muted-foreground">{title}</span>
      {action}
    </div>
  );
}
