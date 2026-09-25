import { NextResponse, type NextRequest } from "next/server";

// The captive portal is served on its own hostname (e.g. portal.wispname.com).
// Requests to a host starting with "portal." are rewritten into /portal/*.
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const { pathname } = req.nextUrl;
  if (host.startsWith("portal.") && !pathname.startsWith("/portal")) {
    const url = req.nextUrl.clone();
    url.pathname = "/portal" + (pathname === "/" ? "" : pathname);
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
