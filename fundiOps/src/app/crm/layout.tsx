import Link from "next/link";
import { MessageSquare, Users, Bell, Settings } from "lucide-react";

const NAV = [
  { href: "/crm", label: "Pipeline", icon: Users },
  { href: "/crm/follow-ups", label: "Follow-ups", icon: Bell },
];

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-fundiops-bg/80 backdrop-blur border-b border-fundiops-border px-6 py-3 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 mr-4">
          <MessageSquare size={18} className="text-fundiops-accent" />
          <span className="font-bold text-fundiops-text">
            fundi<span className="text-fundiops-accent">Ops</span>
          </span>
        </Link>

        <nav className="flex gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-fundiops-muted hover:text-fundiops-text hover:bg-fundiops-card transition-colors"
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </nav>

        <Link
          href="/crm/settings"
          className="ml-auto text-fundiops-muted hover:text-fundiops-text"
          title="Settings"
        >
          <Settings size={18} />
        </Link>
      </header>

      {/* Page content — full width for Kanban */}
      <main className="flex-1 px-6 py-6 overflow-x-auto">{children}</main>
    </div>
  );
}
