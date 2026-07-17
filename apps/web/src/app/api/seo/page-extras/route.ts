import { NextRequest, NextResponse } from "next/server";
import { getSeoPageByPath } from "@/lib/seo-config";
import { normalizeSeoPath } from "@/lib/seo-pages";

/**
 * Public read-only SEO extras for the current path.
 * Used by client components so soft navigations stay in sync.
 * Only exposes fields already rendered on the public site (no internalNotes).
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("path") || "/";
  const path = normalizeSeoPath(raw);

  if (path.startsWith("/api") || path.startsWith("/seopanel") || path.startsWith("/admin")) {
    return NextResponse.json({ success: true, page: null });
  }

  const page = await getSeoPageByPath(path);
  if (!page) {
    return NextResponse.json({ success: true, page: null });
  }

  return NextResponse.json(
    {
      success: true,
      page: {
        path: page.path,
        h1: page.h1,
        breadcrumbLabel: page.breadcrumbLabel,
        schemaJson: page.schemaJson,
        headerScripts: page.headerScripts,
        bodyScripts: page.bodyScripts,
        bodyContentHtml: page.bodyContentHtml,
        bodyContentPosition: page.bodyContentPosition || "bottom",
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    }
  );
}
