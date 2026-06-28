import Link from "next/link";
import { MessageSquare, Users, Bell } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-fundiops-accent/10 border border-fundiops-accent/20 rounded-full px-4 py-1.5 text-fundiops-accent text-sm mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-fundiops-accent animate-pulse" />
          WhatsApp AI CRM
        </div>
        <h1 className="text-4xl font-bold text-fundiops-text mb-3">
          fundi<span className="text-fundiops-accent">Ops</span>
        </h1>
        <p className="text-fundiops-muted max-w-sm">
          Your WhatsApp conversations, automatically organized into leads,
          follow-ups, and a live CRM pipeline.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10 max-w-sm w-full">
        {[
          { icon: MessageSquare, label: "Auto-classify leads" },
          { icon: Users, label: "CRM pipeline" },
          { icon: Bell, label: "Smart follow-ups" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 p-4 bg-fundiops-card border border-fundiops-border rounded-xl text-xs text-fundiops-muted"
          >
            <Icon size={20} className="text-fundiops-accent" />
            {label}
          </div>
        ))}
      </div>

      <Link
        href="/crm"
        className="px-6 py-3 bg-fundiops-accent text-black font-semibold rounded-xl hover:bg-fundiops-accent-muted hover:text-white transition-colors"
      >
        Open CRM →
      </Link>
    </main>
  );
}
