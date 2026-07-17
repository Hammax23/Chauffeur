import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { verifySeoPanelAuth, getClientIP } from "@/lib/seo-auth";
import { discoverSitePages, normalizeSeoPath } from "@/lib/seo-pages";
import { sanitizeInput, sanitizeUrl } from "@/lib/sanitize";
import { sanitizeSeoPageBodyHtml, sanitizeSeoScripts } from "@/lib/seo-page-content";
import { logSeoAudit } from "@/lib/seo-audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const decoded = decodeURIComponent(id);
  const path = normalizeSeoPath(decoded.startsWith("/") ? decoded : `/${decoded}`);

  const discovered = (await discoverSitePages()).find((p) => p.path === path);
  const page = await prisma.seoPage.findUnique({ where: { path } }).catch(() => null);

  if (!discovered && !page) {
    return NextResponse.json({ success: false, error: "Page not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    page: page ?? {
      path,
      pageType: discovered?.pageType ?? "static",
      pageLabel: discovered?.pageLabel ?? path,
      title: discovered?.defaultTitle ?? null,
      metaDescription: discovered?.defaultDescription ?? null,
      robotsIndex: true,
      robotsFollow: true,
      includeInSitemap: true,
    },
    discovered,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const decoded = decodeURIComponent(id);
    const path = normalizeSeoPath(decoded.startsWith("/") ? decoded : `/${decoded}`);
    const body = await request.json();
    const str = (key: string) => (body[key] != null ? sanitizeInput(String(body[key])) : undefined);
    const url = (key: string) => (body[key] != null ? sanitizeUrl(String(body[key])) || null : undefined);
    const html = (key: string) => (body[key] != null ? sanitizeSeoPageBodyHtml(String(body[key])) : undefined);
    const scripts = (key: string) =>
      body[key] != null ? sanitizeSeoScripts(String(body[key])) || null : undefined;
    const bool = (key: string) => (typeof body[key] === "boolean" ? body[key] : undefined);
    const num = (key: string) => (typeof body[key] === "number" ? body[key] : undefined);

    const discovered = (await discoverSitePages()).find((p) => p.path === path);

    const page = await prisma.seoPage.upsert({
      where: { path },
      create: {
        path,
        pageType: discovered?.pageType ?? "static",
        pageLabel: str("pageLabel") || discovered?.pageLabel || path,
        title: str("title") || null,
        metaDescription: str("metaDescription") || null,
        keywords: str("keywords") || null,
        canonicalUrl: url("canonicalUrl") ?? null,
        ogTitle: str("ogTitle") || null,
        ogDescription: str("ogDescription") || null,
        ogImage: url("ogImage") ?? null,
        twitterTitle: str("twitterTitle") || null,
        twitterDescription: str("twitterDescription") || null,
        twitterImage: url("twitterImage") ?? null,
        h1: str("h1") || null,
        focusKeyword: str("focusKeyword") || null,
        robotsIndex: bool("robotsIndex") ?? true,
        robotsFollow: bool("robotsFollow") ?? true,
        noarchive: bool("noarchive") ?? false,
        nosnippet: bool("nosnippet") ?? false,
        includeInSitemap: bool("includeInSitemap") ?? true,
        sitemapPriority: num("sitemapPriority") ?? null,
        sitemapChangeFreq: str("sitemapChangeFreq") || null,
        schemaJson: body.schemaJson ?? null,
        breadcrumbLabel: str("breadcrumbLabel") || null,
        headerScripts: scripts("headerScripts") ?? null,
        bodyScripts: scripts("bodyScripts") ?? null,
        bodyContentHtml: html("bodyContentHtml") || null,
        bodyContentPosition: str("bodyContentPosition") || "bottom",
        bodyContentImages: body.bodyContentImages ?? null,
        internalNotes: str("internalNotes") || null,
        lastAuditedAt: new Date(),
      },
      update: {
        ...(str("pageLabel") !== undefined && { pageLabel: str("pageLabel") }),
        ...(str("title") !== undefined && { title: str("title") || null }),
        ...(str("metaDescription") !== undefined && { metaDescription: str("metaDescription") || null }),
        ...(str("keywords") !== undefined && { keywords: str("keywords") || null }),
        ...(url("canonicalUrl") !== undefined && { canonicalUrl: url("canonicalUrl") }),
        ...(str("ogTitle") !== undefined && { ogTitle: str("ogTitle") || null }),
        ...(str("ogDescription") !== undefined && { ogDescription: str("ogDescription") || null }),
        ...(url("ogImage") !== undefined && { ogImage: url("ogImage") }),
        ...(str("twitterTitle") !== undefined && { twitterTitle: str("twitterTitle") || null }),
        ...(str("twitterDescription") !== undefined && {
          twitterDescription: str("twitterDescription") || null,
        }),
        ...(url("twitterImage") !== undefined && { twitterImage: url("twitterImage") }),
        ...(str("h1") !== undefined && { h1: str("h1") || null }),
        ...(str("focusKeyword") !== undefined && { focusKeyword: str("focusKeyword") || null }),
        ...(bool("robotsIndex") !== undefined && { robotsIndex: bool("robotsIndex") }),
        ...(bool("robotsFollow") !== undefined && { robotsFollow: bool("robotsFollow") }),
        ...(bool("noarchive") !== undefined && { noarchive: bool("noarchive") }),
        ...(bool("nosnippet") !== undefined && { nosnippet: bool("nosnippet") }),
        ...(bool("includeInSitemap") !== undefined && { includeInSitemap: bool("includeInSitemap") }),
        ...(num("sitemapPriority") !== undefined && { sitemapPriority: num("sitemapPriority") }),
        ...(str("sitemapChangeFreq") !== undefined && {
          sitemapChangeFreq: str("sitemapChangeFreq") || null,
        }),
        ...(body.schemaJson !== undefined && { schemaJson: body.schemaJson }),
        ...(str("breadcrumbLabel") !== undefined && { breadcrumbLabel: str("breadcrumbLabel") || null }),
        ...(scripts("headerScripts") !== undefined && { headerScripts: scripts("headerScripts") }),
        ...(scripts("bodyScripts") !== undefined && { bodyScripts: scripts("bodyScripts") }),
        ...(html("bodyContentHtml") !== undefined && { bodyContentHtml: html("bodyContentHtml") || null }),
        ...(str("bodyContentPosition") !== undefined && {
          bodyContentPosition: str("bodyContentPosition") || "bottom",
        }),
        ...(body.bodyContentImages !== undefined && { bodyContentImages: body.bodyContentImages ?? null }),
        ...(str("internalNotes") !== undefined && { internalNotes: str("internalNotes") || null }),
        lastAuditedAt: new Date(),
      },
    });

    revalidatePath(path);
    revalidatePath("/", "layout");

    await logSeoAudit({
      action: "update",
      entityType: "page",
      entityId: page.id,
      entityLabel: path,
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true, page });
  } catch (error) {
    console.error("[SEO Page Update]", error);
    return NextResponse.json({ success: false, error: "Failed to save page" }, { status: 500 });
  }
}
