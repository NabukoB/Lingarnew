import { NextResponse, type NextRequest } from "next/server";

// The captive portal is served on its own hostname: portal.<domain>, or a
// WISP's custom domain when DASHBOARD_HOSTS lists the dashboard hostnames.
// Those hosts are rewritten into /portal/*. The router's login page sends
// ?t=&mac=&link=&router=; they are kept in the wisp_portal cookie (and passed
// to this same request, so the first page already knows them).
const PORTAL_KEYS = ["t", "mac", "link", "router", "error"] as const;
const COOKIE = "wisp_portal";

function isPortalHost(host: string): boolean {
  const h = host.split(":")[0] ?? "";
  if (h.startsWith("portal.")) return true;
  const dash = (process.env.DASHBOARD_HOSTS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return dash.length > 0 && !dash.includes(h) && h !== "localhost";
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const { pathname, searchParams } = req.nextUrl;
  const portalHost = isPortalHost(host);
  const isPortal = portalHost || pathname.startsWith("/portal");

  let cookieValue: string | null = null;
  const headers = new Headers(req.headers);
  if (isPortal) {
    const incoming = PORTAL_KEYS.filter((k) => searchParams.has(k));
    if (incoming.length > 0) {
      let ctx: Record<string, string> = {};
      try {
        ctx = JSON.parse(req.cookies.get(COOKIE)?.value ?? "{}");
      } catch {
        ctx = {};
      }
      if (searchParams.has("mac")) delete ctx.error;
      for (const k of incoming) ctx[k] = (searchParams.get(k) ?? "").slice(0, 300);
      cookieValue = JSON.stringify(ctx);
      const others = req.cookies.getAll().filter((c) => c.name !== COOKIE).map((c) => `${c.name}=${encodeURIComponent(c.value)}`);
      headers.set("cookie", [...others, `${COOKIE}=${encodeURIComponent(cookieValue)}`].join("; "));
    }
  }

  let res: NextResponse;
  if (portalHost && !pathname.startsWith("/portal")) {
    const url = req.nextUrl.clone();
    url.pathname = "/portal" + (pathname === "/" ? "" : pathname);
    res = NextResponse.rewrite(url, { request: { headers } });
  } else {
    res = NextResponse.next({ request: { headers } });
  }
  if (cookieValue !== null) {
    res.cookies.set(COOKIE, cookieValue, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
