import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { normalizeSeoPath } from "@/lib/seo-pages";
import { getSeoRedirectsInternalSecret } from "@/lib/seo-redirects-secret";

export async function middleware(request: NextRequest) {
  const pathname = normalizeSeoPath(request.nextUrl.pathname);

  // Skip API routes and SEO panel to avoid redirect loops
  if (pathname.startsWith("/api/") || pathname.startsWith("/seopanel")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Hard redirects for known duplicates (keep out of SEO redirects DB).
  if (pathname === "/cities-we-serve/ottawa-montreal") {
    return NextResponse.redirect(new URL("/cities-we-serve/ottawa", request.url), 301);
  }

  // Normalize Cities URLs to lowercase slugs (SEO requested links are capitalized).
  if (pathname.toLowerCase().startsWith("/cities-we-serve/")) {
    const normalizedLower = pathname.toLowerCase();
    if (pathname !== normalizedLower) {
      return NextResponse.redirect(new URL(normalizedLower, request.url), 301);
    }
  }

  try {
    const redirectUrl = new URL("/api/seo-redirects", request.url);
    const res = await fetch(redirectUrl.toString(), {
      headers: {
        "x-seo-middleware": "1",
        "x-seo-redirects-secret": getSeoRedirectsInternalSecret(),
      },
      cache: "no-store",
    });

    if (res.ok) {
      const redirects: { sourcePath: string; destinationPath: string; redirectType: number }[] =
        await res.json();
      const match = redirects.find((r) => normalizeSeoPath(r.sourcePath) === pathname);

      if (match) {
        const dest = match.destinationPath.startsWith("http")
          ? match.destinationPath
          : new URL(match.destinationPath, request.url).toString();
        return NextResponse.redirect(dest, match.redirectType);
      }
    }
  } catch {
    // Continue without redirect if lookup fails
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo1.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico|woff2?)$).*)",
  ],
};
