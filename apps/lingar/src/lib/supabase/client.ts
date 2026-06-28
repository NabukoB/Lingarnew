"use client";

import { createBrowserClient } from "@supabase/ssr";

// Singleton to avoid multiple GoTrue auth instances in the same tab.
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (_client) return _client;
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
  return _client;
}
