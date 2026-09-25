import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

// Optimistic check only: is there a valid session cookie? Role and approval
// checks happen on the server in every page, action and route handler.
const PUBLIC_PATHS = ["/prijava", "/registracija"];
const ALWAYS_ALLOWED = ["/odjava", "/robots.txt", "/sitemap.xml", "/manifest.webmanifest"];
// Metadata images (OG/Twitter cards, icons) must be reachable by crawlers and
// link previews without a session. Next may append a hash suffix.
const PUBLIC_PREFIXES = ["/opengraph-image", "/twitter-image", "/icon", "/apple-icon"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (ALWAYS_ALLOWED.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  const userId = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!userId && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/prijava", request.url));
  }
  if (userId && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|ico|webp)$).*)"],
};
