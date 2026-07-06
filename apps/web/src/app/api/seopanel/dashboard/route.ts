import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySeoPanelAuth } from "@/lib/seo-auth";
import { discoverSitePages, calculateSeoScore } from "@/lib/seo-pages";
import { getSeoSettings } from "@/lib/seo-config";
import { getBlogPanelStats } from "@/lib/blog";

export async function GET(request: NextRequest) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [settings, pages, redirects, blogStats] = await Promise.all([
      getSeoSettings(),
      prisma.seoPage.findMany().catch(() => []),
      prisma.seoRedirect.count({ where: { isActive: true } }).catch(() => 0),
      getBlogPanelStats(),
    ]);

    const discovered = await discoverSitePages();
    const pageMap = new Map(pages.map((p) => [p.path, p]));

    const enriched = discovered.map((d) => {
      const db = pageMap.get(d.path);
      const score = calculateSeoScore(db ?? { title: d.defaultTitle, metaDescription: d.defaultDescription });
      return {
        path: d.path,
        pageLabel: db?.pageLabel ?? d.pageLabel,
        pageType: d.pageType,
        hasOverride: !!db,
        score,
        missingTitle: !(db?.title || d.defaultTitle),
        missingDescription: !(db?.metaDescription || d.defaultDescription),
        missingOgImage: !db?.ogImage && !settings.defaultOgImage,
        robotsIndex: db?.robotsIndex ?? true,
      };
    });

    const avgScore =
      enriched.length > 0
        ? Math.round(enriched.reduce((sum, p) => sum + p.score, 0) / enriched.length)
        : 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalPages: discovered.length,
        pagesWithOverrides: pages.length,
        missingTitles: enriched.filter((p) => p.missingTitle).length,
        missingDescriptions: enriched.filter((p) => p.missingDescription).length,
        missingOgImages: enriched.filter((p) => p.missingOgImage).length,
        noindexPages: enriched.filter((p) => !p.robotsIndex).length,
        activeRedirects: redirects,
        averageSeoScore: avgScore,
        sitemapEnabled: settings.sitemapEnabled,
        siteUrl: settings.siteUrl,
        blogTotal: blogStats.total,
        blogPublished: blogStats.published,
        blogDraft: blogStats.draft,
      },
      pages: enriched.sort((a, b) => a.score - b.score).slice(0, 10),
    });
  } catch (error) {
    console.error("[SEO Dashboard]", error);
    return NextResponse.json({ success: false, error: "Failed to load dashboard" }, { status: 500 });
  }
}
