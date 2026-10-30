import { NextResponse, type NextRequest } from "next/server";

import { parseHost } from "@/lib/tenant/host";

const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || "manadeals_admin_session";
const OWNER_COOKIE = process.env.OWNER_COOKIE_NAME || "manadeals_owner_session";

/**
 * Edge middleware does two things:
 *  1. Applies security headers to every response.
 *  2. Performs a cheap cookie presence check so unauthenticated visitors are
 *     bounced before a page renders. The cryptographic verification happens in
 *     `getSession()` on the Node runtime — never trust this check alone.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const target = parseHost(request.headers.get("host"));
  if (target.kind !== "main") return tenantResponse(request, target.hostname);

  // The tenant route tree is reachable only through a tenant host rewrite.
  if (pathname === "/stores" || pathname.startsWith("/stores/")) {
    return withSecurityHeaders(NextResponse.redirect(new URL("/", request.url)));
  }

  // Store-owner dashboard: cheap cookie presence check; the layout verifies the session.
  const ownerPublic = pathname === "/dashboard/login" || pathname === "/dashboard/signup";
  if (pathname.startsWith("/dashboard") && !ownerPublic && !request.cookies.get(OWNER_COOKIE)?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard/login";
    url.search = "";
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  const hasSessionCookie = Boolean(request.cookies.get(AUTH_COOKIE)?.value);

  const isLoginRoute =
    pathname === "/admin/login" ||
    pathname === "/admin/forgot-password" ||
    pathname.startsWith("/admin/reset-password");

  if (pathname.startsWith("/admin") && !isLoginRoute && !hasSessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  if (isLoginRoute && hasSessionCookie && pathname === "/admin/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  // Public main-site pages keep their previous behaviour (no extra headers).
  // The tenant header is set only for store hosts; never trust one sent from outside.
  const headers = new Headers(request.headers);
  headers.delete("x-tenant-host");
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin") && !pathname.startsWith("/dashboard")) {
    return NextResponse.next({ request: { headers } });
  }
  return withSecurityHeaders(NextResponse.next({ request: { headers } }));
}

/** Files such as /logo.png are served as-is; only sitemap and robots are tenant-specific. */
const TENANT_FILES = new Set(["/sitemap.xml", "/robots.txt"]);

/**
 * Store hosts (`{slug}.manadeals.online` or a custom domain) are rewritten into
 * `/stores/{hostname}/...` while the visitor's URL stays unchanged. Whether the
 * host belongs to a real, active store is decided by the route's layout, which
 * can reach the database; this file stays free of it.
 */
function tenantResponse(request: NextRequest, hostname: string) {
  const { pathname, search } = request.nextUrl;

  // The platform admin and its API are not served on store hosts.
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/owner") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/stores")
  ) {
    return withSecurityHeaders(new NextResponse("Not found", { status: 404 }));
  }

  const headers = new Headers(request.headers);
  headers.set("x-tenant-host", hostname);

  const isAsset = pathname.includes(".") && !TENANT_FILES.has(pathname);
  const isShared = pathname.startsWith("/go/") || pathname.startsWith("/api/");
  if (isAsset || isShared) {
    return withSecurityHeaders(NextResponse.next({ request: { headers } }));
  }

  const url = request.nextUrl.clone();
  url.pathname = `/stores/${hostname}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return withSecurityHeaders(NextResponse.rewrite(url, { request: { headers } }));
}

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export const config = {
  // Everything except Next's own static output; host routing needs to see pages.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
