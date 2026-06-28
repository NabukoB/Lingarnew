"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";

interface Settings {
  auto_reply_global: boolean;
  greeting_template: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    auto_reply_global: false,
    greeting_template: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/crm/settings")
      .then((r) => r.json())
      .then((d) => {
        setSettings(d.settings);
        setLoading(false);
      });
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/crm/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto pt-8 text-fundiops-muted text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-fundiops-text mb-6">Settings</h1>

      <div className="bg-fundiops-card border border-fundiops-border rounded-2xl p-6 space-y-6">
        {/* Global auto-reply toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-fundiops-text">
              Global Auto-reply
            </p>
            <p className="text-xs text-fundiops-muted mt-0.5">
              When enabled, the AI greets new first-time leads automatically.
              You can also toggle per-contact.
            </p>
          </div>
          <button
            onClick={() =>
              setSettings((s) => ({
                ...s,
                auto_reply_global: !s.auto_reply_global,
              }))
            }
            className={`relative w-11 h-6 rounded-full transition-colors ${
              settings.auto_reply_global
                ? "bg-fundiops-accent"
                : "bg-fundiops-border"
            }`}
          >
            <div
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                settings.auto_reply_global ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Greeting template */}
        <div>
          <label className="block text-sm font-medium text-fundiops-text mb-1.5">
            Custom Greeting Template
          </label>
          <p className="text-xs text-fundiops-muted mb-2">
            Override the AI greeting message. Leave blank to use AI-generated
            greetings.
          </p>
          <textarea
            rows={4}
            className="w-full bg-fundiops-bg border border-fundiops-border rounded-xl px-3 py-2 text-sm text-fundiops-text placeholder:text-fundiops-muted resize-none focus:outline-none focus:border-fundiops-accent/50"
            placeholder="Hi! Thanks for reaching out to [Business Name]. How can I help you today?"
            value={settings.greeting_template ?? ""}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                greeting_template: e.target.value || null,
              }))
            }
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-fundiops-accent text-black text-sm font-medium rounded-xl hover:bg-fundiops-accent-muted hover:text-white transition-colors disabled:opacity-60"
        >
          <Save size={14} />
          {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
