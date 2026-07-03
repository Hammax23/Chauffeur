import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { normalizeSeoPath } from "@/lib/seo-pages";

export async function middleware(request: NextRequest) {
  const pathname = normalizeSeoPath(request.nextUrl.pathname);

  // Skip API routes and SEO panel to avoid redirect loops
  if (pathname.startsWith("/api/") || pathname.startsWith("/seopanel")) {
    return NextResponse.next();
  }

  try {
    const redirectUrl = new URL("/api/seo-redirects", request.url);
    const res = await fetch(redirectUrl.toString(), {
      headers: { "x-seo-middleware": "1" },
      next: { revalidate: 60 },
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo1.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico|woff2?)$).*)",
  ],
};
