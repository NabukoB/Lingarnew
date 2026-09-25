import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import type { RouterStatus, SubscriberStatus } from "@/lib/types";
import { formatDelta } from "@/lib/format";

export function Card({
  className,
  children,
  as: Tag = "section",
  label,
}: {
  className?: string;
  children: React.ReactNode;
  as?: "section" | "div";
  label?: string;
}) {
  return (
    <Tag aria-label={label} className={clsx("rounded-card bg-white shadow-card", className)}>
      {children}
    </Tag>
  );
}

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
    <span
      className={clsx(
        "flex shrink-0 items-center justify-center",
        size === "lg" ? "h-[54px] w-[54px] rounded-[18px]" : "h-10 w-10 rounded-[14px]",
        tones[tone],
      )}
    >
      <Icon aria-hidden size={size === "lg" ? 22 : 18} strokeWidth={2.2} />
    </span>
  );
}

export function DeltaChip({ pct, decimals = 0, onDark = false }: { pct: number; decimals?: number; onDark?: boolean }) {
  const up = pct >= 0;
  return (
    <span
      className={clsx(
        "whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-extrabold",
        onDark ? "bg-white/20 text-white" : up ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
      )}
    >
      {formatDelta(pct, decimals)}
    </span>
  );
}

const routerStatus: Record<RouterStatus, { label: string; pill: string; dot: string }> = {
  online: { label: "Online", pill: "bg-green-100 text-green-700", dot: "bg-green-600" },
  slow: { label: "Slow", pill: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  offline: { label: "Offline", pill: "bg-red-100 text-red-700", dot: "bg-red-500" },
};

export function RouterStatusDot({ status }: { status: RouterStatus }) {
  return <span aria-hidden className={clsx("h-2.5 w-2.5 shrink-0 rounded-full", routerStatus[status].dot)} />;
}

export function RouterStatusPill({ status }: { status: RouterStatus }) {
  const s = routerStatus[status];
  return <span className={clsx("whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-extrabold", s.pill)}>{s.label}</span>;
}

const subStatus: Record<SubscriberStatus, { label: string; pill: string }> = {
  active: { label: "Active", pill: "bg-green-100 text-green-700" },
  grace: { label: "In grace", pill: "bg-amber-100 text-amber-800" },
  suspended: { label: "Suspended", pill: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", pill: "bg-slate-100 text-slate-600" },
};

export function SubscriberStatusPill({ status }: { status: SubscriberStatus }) {
  const s = subStatus[status];
  return <span className={clsx("whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold", s.pill)}>{s.label}</span>;
}

export const subscriberStatusLabel = (s: SubscriberStatus) => subStatus[s].label;

export function Avatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-full bg-blue-100 font-extrabold text-blue-700",
        className ?? "h-11 w-11 text-sm",
      )}
    >
      {initials}
    </span>
  );
}

export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
