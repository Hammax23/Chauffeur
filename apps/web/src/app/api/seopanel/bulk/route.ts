import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySeoPanelAuth, getClientIP } from "@/lib/seo-auth";
import { logSeoAudit } from "@/lib/seo-audit";
import { syncSeoPages } from "@/lib/seo-config";

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

    let imported = { settings: 0, pages: 0, redirects: 0, blogPosts: 0, cities: 0, services: 0 };

    if (data.settings?.id === "global") {
      const { id, createdAt, updatedAt, ...settingsData } = data.settings;
      await prisma.seoSettings.upsert({
        where: { id: "global" },
        create: { id: "global", ...settingsData },
        update: settingsData,
      });
      imported.settings = 1;
    }

    if (Array.isArray(data.pages)) {
      for (const page of data.pages) {
        const { id, createdAt, updatedAt, ...pageData } = page;
        await prisma.seoPage.upsert({
          where: { path: pageData.path },
          create: pageData,
          update: pageData,
        });
        imported.pages++;
      }
    }

    if (Array.isArray(data.redirects)) {
      for (const redirect of data.redirects) {
        const { id, createdAt, updatedAt, ...redirectData } = redirect;
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
        await prisma.managedService.upsert({
          where: { slug: serviceData.slug },
          create: serviceData,
          update: serviceData,
        });
        imported.services++;
      }
    }

    await syncSeoPages();

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
