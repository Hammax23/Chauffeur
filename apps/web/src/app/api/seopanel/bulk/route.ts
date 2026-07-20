import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { verifySeoPanelAuth, getClientIP } from "@/lib/seo-auth";
import { logSeoAudit } from "@/lib/seo-audit";
import { syncSeoPages } from "@/lib/seo-config";
import { sanitizePlainText, sanitizeUrl } from "@/lib/sanitize";
import { sanitizeSeoPageBodyHtml, sanitizeSeoScripts } from "@/lib/seo-page-content";
import { normalizeSeoPath } from "@/lib/seo-pages";

function sanitizeImportedPage(page: Record<string, unknown>) {
  const pathRaw = String(page.path || "");
  const path = normalizeSeoPath(pathRaw.startsWith("/") ? pathRaw : `/${pathRaw}`);
  if (!path) return null;

  return {
    ...page,
    path,
    pageLabel: page.pageLabel != null ? sanitizePlainText(String(page.pageLabel)) : path,
    title: page.title != null ? sanitizePlainText(String(page.title)) || null : null,
    metaDescription:
      page.metaDescription != null ? sanitizePlainText(String(page.metaDescription)) || null : null,
    keywords: page.keywords != null ? sanitizePlainText(String(page.keywords)) || null : null,
    canonicalUrl: page.canonicalUrl != null ? sanitizeUrl(String(page.canonicalUrl)) || null : null,
    ogTitle: page.ogTitle != null ? sanitizePlainText(String(page.ogTitle)) || null : null,
    ogDescription:
      page.ogDescription != null ? sanitizePlainText(String(page.ogDescription)) || null : null,
    ogImage: page.ogImage != null ? sanitizeUrl(String(page.ogImage)) || null : null,
    twitterTitle: page.twitterTitle != null ? sanitizePlainText(String(page.twitterTitle)) || null : null,
    twitterDescription:
      page.twitterDescription != null
        ? sanitizePlainText(String(page.twitterDescription)) || null
        : null,
    twitterImage: page.twitterImage != null ? sanitizeUrl(String(page.twitterImage)) || null : null,
    h1: page.h1 != null ? sanitizePlainText(String(page.h1)) || null : null,
    focusKeyword: page.focusKeyword != null ? sanitizePlainText(String(page.focusKeyword)) || null : null,
    breadcrumbLabel:
      page.breadcrumbLabel != null ? sanitizePlainText(String(page.breadcrumbLabel)) || null : null,
    headerScripts:
      page.headerScripts != null ? sanitizeSeoScripts(String(page.headerScripts)) || null : null,
    bodyScripts:
      page.bodyScripts != null ? sanitizeSeoScripts(String(page.bodyScripts)) || null : null,
    bodyContentHtml:
      page.bodyContentHtml != null
        ? sanitizeSeoPageBodyHtml(String(page.bodyContentHtml)) || null
        : null,
    bodyContentPosition:
      page.bodyContentPosition != null
        ? sanitizePlainText(String(page.bodyContentPosition)) || "bottom"
        : "bottom",
    internalNotes:
      page.internalNotes != null ? sanitizePlainText(String(page.internalNotes)) || null : null,
  };
}

export async function GET(request: NextRequest) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [settings, pages, redirects, blogPosts, cities, services] = await Promise.all([
      prisma.seoSettings.findUnique({ where: { id: "global" } }),
      prisma.seoPage.findMany(),
      prisma.seoRedirect.findMany(),
      prisma.blogPost.findMany(),
      prisma.managedCity.findMany().catch(() => []),
      prisma.managedService.findMany().catch(() => []),
    ]);

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      pages,
      redirects,
      blogPosts,
      cities,
      services,
    };

    await logSeoAudit({
      action: "export",
      entityType: "bulk",
      entityLabel: "Full SEO export",
      details: {
        pages: pages.length,
        redirects: redirects.length,
        blogPosts: blogPosts.length,
      },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    console.error("[SEO Export]", error);
    return NextResponse.json({ success: false, error: "Export failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = body.data ?? body;

    if (!data || typeof data !== "object") {
      return NextResponse.json({ success: false, error: "Invalid import payload" }, { status: 400 });
    }

    const imported = { settings: 0, pages: 0, redirects: 0, blogPosts: 0, cities: 0, services: 0 };

    if (data.settings?.id === "global") {
      const { id, createdAt, updatedAt, ...settingsData } = data.settings;
      if (settingsData.siteUrl) {
        settingsData.siteUrl = sanitizeUrl(settingsData.siteUrl) || "https://sarjworldwide.ca";
      }
      if (settingsData.defaultOgImage) {
        settingsData.defaultOgImage = sanitizeUrl(settingsData.defaultOgImage) || null;
      }
      if (settingsData.organizationLogo) {
        settingsData.organizationLogo = sanitizeUrl(settingsData.organizationLogo) || null;
      }
      await prisma.seoSettings.upsert({
        where: { id: "global" },
        create: { id: "global", ...settingsData },
        update: settingsData,
      });
      imported.settings = 1;
    }

    if (Array.isArray(data.pages)) {
      for (const page of data.pages) {
        const { id, createdAt, updatedAt, ...raw } = page;
        const pageData = sanitizeImportedPage(raw as Record<string, unknown>);
        if (!pageData) continue;
        await prisma.seoPage.upsert({
          where: { path: pageData.path as string },
          create: pageData as never,
          update: pageData as never,
        });
        imported.pages++;
      }
    }

    if (Array.isArray(data.redirects)) {
      for (const redirect of data.redirects) {
        const { id, createdAt, updatedAt, ...redirectData } = redirect;
        if (redirectData.sourcePath) {
          redirectData.sourcePath = normalizeSeoPath(String(redirectData.sourcePath));
        }
        if (redirectData.destinationPath) {
          const dest = String(redirectData.destinationPath);
          redirectData.destinationPath = dest.startsWith("http")
            ? sanitizeUrl(dest)
            : normalizeSeoPath(dest);
        }
        if (!redirectData.sourcePath || !redirectData.destinationPath) continue;
        await prisma.seoRedirect.upsert({
          where: { sourcePath: redirectData.sourcePath },
          create: redirectData,
          update: redirectData,
        });
        imported.redirects++;
      }
    }

    if (Array.isArray(data.blogPosts)) {
      for (const post of data.blogPosts) {
        const { id, createdAt, updatedAt, publishedAt, ...postData } = post;
        if (postData.content) {
          postData.content = sanitizeSeoPageBodyHtml(String(postData.content));
        }
        if (postData.excerpt) {
          postData.excerpt = sanitizePlainText(String(postData.excerpt));
        }
        if (postData.title) {
          postData.title = sanitizePlainText(String(postData.title));
        }
        await prisma.blogPost.upsert({
          where: { slug: postData.slug },
          create: {
            ...postData,
            publishedAt: publishedAt ? new Date(publishedAt) : null,
          },
          update: {
            ...postData,
            publishedAt: publishedAt ? new Date(publishedAt) : null,
          },
        });
        imported.blogPosts++;
      }
    }

    if (Array.isArray(data.cities)) {
      for (const city of data.cities) {
        const { id, createdAt, updatedAt, ...cityData } = city;
        if (cityData.description) {
          cityData.description = sanitizePlainText(String(cityData.description));
        }
        if (cityData.label) {
          cityData.label = sanitizePlainText(String(cityData.label));
        }
        await prisma.managedCity.upsert({
          where: { slug: cityData.slug },
          create: cityData,
          update: cityData,
        });
        imported.cities++;
      }
    }

    if (Array.isArray(data.services)) {
      for (const service of data.services) {
        const { id, createdAt, updatedAt, ...serviceData } = service;
        if (serviceData.description) {
          serviceData.description = sanitizeSeoPageBodyHtml(String(serviceData.description));
        }
        if (serviceData.shortDesc) {
          serviceData.shortDesc = sanitizePlainText(String(serviceData.shortDesc));
        }
        if (serviceData.title) {
          serviceData.title = sanitizePlainText(String(serviceData.title));
        }
        await prisma.managedService.upsert({
          where: { slug: serviceData.slug },
          create: serviceData,
          update: serviceData,
        });
        imported.services++;
      }
    }

    await syncSeoPages();

    revalidatePath("/", "layout");
    revalidatePath("/robots.txt");
    revalidatePath("/sitemap.xml");
    revalidatePath("/news");
    revalidatePath("/services");
    revalidatePath("/cities-we-serve");

    await logSeoAudit({
      action: "import",
      entityType: "bulk",
      entityLabel: "Full SEO import",
      details: imported,
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true, imported });
  } catch (error) {
    console.error("[SEO Import]", error);
    return NextResponse.json({ success: false, error: "Import failed" }, { status: 500 });
  }
}
