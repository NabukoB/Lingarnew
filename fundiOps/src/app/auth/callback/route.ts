import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  // Only allow relative paths to prevent open redirect
  const rawNext = searchParams.get("next") ?? "/crm";
  const next = rawNext.startsWith("/") ? rawNext : "/crm";

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Auth exchange error:", error.message);
      return NextResponse.redirect(
        new URL("/login?error=Authentication+failed", req.url)
      );
    }
  }

  return NextResponse.redirect(new URL(next, req.url));
}
