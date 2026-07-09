import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySeoPanelAuth, getClientIP } from "@/lib/seo-auth";
import { discoverSitePages, calculateSeoScore, normalizeSeoPath, getPageTypeLabel } from "@/lib/seo-pages";
import { syncSeoPages } from "@/lib/seo-config";
import { logSeoAudit } from "@/lib/seo-audit";

export async function GET(request: NextRequest) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase() ?? "";
  const type = searchParams.get("type") ?? "";

  try {
    const [discovered, dbPages] = await Promise.all([
      discoverSitePages(),
      prisma.seoPage.findMany().catch(() => []),
    ]);

    const pageMap = new Map(dbPages.map((p) => [p.path, p]));

    let pages = discovered.map((d) => {
      const db = pageMap.get(d.path);
      return {
        id: db?.id ?? null,
        path: d.path,
        pageLabel: db?.pageLabel ?? d.pageLabel,
        pageType: d.pageType,
        pageTypeLabel: getPageTypeLabel(d.pageType),
        title: db?.title ?? d.defaultTitle ?? null,
        metaDescription: db?.metaDescription ?? d.defaultDescription ?? null,
        focusKeyword: db?.focusKeyword ?? null,
        robotsIndex: db?.robotsIndex ?? true,
        includeInSitemap: db?.includeInSitemap ?? d.pageType !== "utility",
        hasOverride: !!db,
        score: calculateSeoScore({
          title: db?.title ?? d.defaultTitle,
          metaDescription: db?.metaDescription ?? d.defaultDescription,
          focusKeyword: db?.focusKeyword,
          ogImage: db?.ogImage,
          canonicalUrl: db?.canonicalUrl,
          h1: db?.h1,
          schemaJson: db?.schemaJson,
        }),
        updatedAt: db?.updatedAt ?? null,
      };
    });

    if (q) {
      pages = pages.filter(
        (p) =>
          p.path.toLowerCase().includes(q) ||
          (p.pageLabel?.toLowerCase().includes(q) ?? false) ||
          (p.title?.toLowerCase().includes(q) ?? false)
      );
    }
    if (type) pages = pages.filter((p) => p.pageType === type);

    return NextResponse.json({ success: true, pages, total: pages.length });
  } catch (error) {
    console.error("[SEO Pages]", error);
    return NextResponse.json({ success: false, error: "Failed to load pages" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncSeoPages();
    await logSeoAudit({
      action: "sync",
      entityType: "page",
      entityLabel: "Page discovery sync",
      details: result,
      ipAddress: getClientIP(request),
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[SEO Pages Sync]", error);
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
