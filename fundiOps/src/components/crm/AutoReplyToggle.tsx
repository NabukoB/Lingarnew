"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AutoReplyToggle({
  contactId,
  defaultValue,
}: {
  contactId: string;
  defaultValue: boolean;
}) {
  const [enabled, setEnabled] = useState(defaultValue);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    setLoading(true);
    const next = !enabled;
    setEnabled(next);
    await fetch(`/api/crm/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auto_reply: next }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="flex items-center gap-2 text-sm"
      aria-label="Toggle auto-reply"
    >
      <span className="text-fundiops-muted">Auto-reply</span>
      <div
        className={`relative w-10 h-5 rounded-full transition-colors ${
          enabled ? "bg-fundiops-accent" : "bg-fundiops-border"
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
    </button>
  );
}
