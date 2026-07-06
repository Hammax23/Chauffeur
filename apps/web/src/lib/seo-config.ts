import prisma from "@/lib/prisma";
import type { SeoPage, SeoSettings } from "@prisma/client";
import { discoverSitePages, normalizeSeoPath } from "@/lib/seo-pages";

const DEFAULT_SETTINGS: Omit<SeoSettings, "createdAt" | "updatedAt"> = {
  id: "global",
  siteUrl: "https://sarjworldwide.ca",
  siteName: "SARJ Worldwide Chauffeur Services",
  titleTemplate: "%s | SARJ Worldwide Chauffeur",
  defaultTitle: "SARJ Worldwide Chauffeur Services | Premium Luxury Transportation",
  defaultDescription:
    "SARJ Worldwide chauffeur services. Airport transfers, corporate travel, weddings, VIP transport & city tours. Professional chauffeurs, premium vehicles.",
  defaultKeywords: null,
  defaultOgImage: "https://sarjworldwide.ca/logo1.png",
  twitterHandle: "@sarjworldwide",
  twitterCardType: "summary_large_image",
  googleVerification: null,
  bingVerification: null,
  yandexVerification: null,
  pinterestVerification: null,
  facebookAppId: null,
  ga4Id: null,
  gtmId: null,
  facebookPixelId: null,
  organizationName: "SARJ Worldwide Chauffeur Services",
  organizationLogo: "https://sarjworldwide.ca/logo1.png",
  organizationPhone: null,
  organizationEmail: null,
  organizationAddress: null,
  organizationCity: null,
  organizationRegion: null,
  organizationPostal: null,
  organizationCountry: "CA",
  localBusinessSchema: null,
  websiteSchema: null,
  robotsExtraRules: null,
  sitemapEnabled: true,
  defaultChangeFreq: "weekly",
  defaultPriority: 0.8,
};

export async function getSeoSettings(): Promise<SeoSettings> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { ...DEFAULT_SETTINGS, createdAt: new Date(), updatedAt: new Date() };
  }

  try {
    const settings = await prisma.seoSettings.findUnique({ where: { id: "global" } });
    if (settings) return settings;

    return await prisma.seoSettings.create({
      data: {
        id: "global",
        siteUrl: DEFAULT_SETTINGS.siteUrl,
        siteName: DEFAULT_SETTINGS.siteName,
        titleTemplate: DEFAULT_SETTINGS.titleTemplate,
        defaultTitle: DEFAULT_SETTINGS.defaultTitle,
        defaultDescription: DEFAULT_SETTINGS.defaultDescription,
      },
    });
  } catch {
    return { ...DEFAULT_SETTINGS, createdAt: new Date(), updatedAt: new Date() };
  }
}

export async function getSeoPageByPath(path: string): Promise<SeoPage | null> {
  const normalized = normalizeSeoPath(path);
  if (!process.env.DATABASE_URL?.trim()) return null;

  try {
    return await prisma.seoPage.findUnique({ where: { path: normalized } });
  } catch {
    return null;
  }
}

export async function getActiveRedirects(): Promise<
  { sourcePath: string; destinationPath: string; redirectType: number }[]
> {
  if (!process.env.DATABASE_URL?.trim()) return [];

  try {
    return await prisma.seoRedirect.findMany({
      where: { isActive: true },
      select: { sourcePath: true, destinationPath: true, redirectType: true },
    });
  } catch {
    return [];
  }
}

/** Sync discovered pages into DB (creates missing rows, does not overwrite SEO data) */
export async function syncSeoPages(): Promise<{ created: number; total: number }> {
  const discovered = await discoverSitePages();
  let created = 0;

  try {
    for (const page of discovered) {
      const existing = await prisma.seoPage.findUnique({ where: { path: page.path } });
      if (!existing) {
        await prisma.seoPage.create({
          data: {
            path: page.path,
            pageType: page.pageType,
            pageLabel: page.pageLabel,
            title: page.defaultTitle ?? null,
            metaDescription: page.defaultDescription ?? null,
            includeInSitemap: page.pageType !== "utility",
            robotsIndex: page.pageType !== "utility",
          },
        });
        created++;
      }
    }
  } catch (error) {
    console.error("[syncSeoPages]", error);
    throw new Error("SEO database tables missing. Run: npx prisma db push");
  }

  return { created, total: discovered.length };
}

export async function getSitemapEntries(): Promise<
  { path: string; priority: number; changeFrequency: string; lastModified: Date }[]
> {
  const settings = await getSeoSettings();
  const discovered = await discoverSitePages();
  const dbPages = process.env.DATABASE_URL?.trim()
    ? await prisma.seoPage.findMany().catch(() => [])
    : [];

  const pageMap = new Map(dbPages.map((p) => [p.path, p]));

  return discovered
    .filter((d) => {
      const db = pageMap.get(d.path);
      if (db) return db.includeInSitemap && db.robotsIndex;
      return d.pageType !== "utility";
    })
    .map((d) => {
      const db = pageMap.get(d.path);
      return {
        path: d.path,
        priority: db?.sitemapPriority ?? (d.path === "/" ? 1 : settings.defaultPriority),
        changeFrequency: db?.sitemapChangeFreq ?? settings.defaultChangeFreq,
        lastModified: db?.updatedAt ?? new Date(),
      };
    });
}
