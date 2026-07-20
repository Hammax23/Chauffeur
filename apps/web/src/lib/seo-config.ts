import prisma from "@/lib/prisma";
import type { SeoPage, SeoSettings } from "@prisma/client";
import { discoverSitePages, normalizeSeoPath } from "@/lib/seo-pages";
import { decodeHtmlEntities } from "@/lib/sanitize";

function decodePageTextFields(page: SeoPage): SeoPage {
  return {
    ...page,
    pageLabel: page.pageLabel ? decodeHtmlEntities(page.pageLabel) : page.pageLabel,
    title: page.title ? decodeHtmlEntities(page.title) : page.title,
    metaDescription: page.metaDescription
      ? decodeHtmlEntities(page.metaDescription)
      : page.metaDescription,
    keywords: page.keywords ? decodeHtmlEntities(page.keywords) : page.keywords,
    canonicalUrl: page.canonicalUrl ? decodeHtmlEntities(page.canonicalUrl) : page.canonicalUrl,
    ogTitle: page.ogTitle ? decodeHtmlEntities(page.ogTitle) : page.ogTitle,
    ogDescription: page.ogDescription
      ? decodeHtmlEntities(page.ogDescription)
      : page.ogDescription,
    ogImage: page.ogImage ? decodeHtmlEntities(page.ogImage) : page.ogImage,
    twitterTitle: page.twitterTitle ? decodeHtmlEntities(page.twitterTitle) : page.twitterTitle,
    twitterDescription: page.twitterDescription
      ? decodeHtmlEntities(page.twitterDescription)
      : page.twitterDescription,
    twitterImage: page.twitterImage ? decodeHtmlEntities(page.twitterImage) : page.twitterImage,
    h1: page.h1 ? decodeHtmlEntities(page.h1) : page.h1,
    focusKeyword: page.focusKeyword ? decodeHtmlEntities(page.focusKeyword) : page.focusKeyword,
    breadcrumbLabel: page.breadcrumbLabel
      ? decodeHtmlEntities(page.breadcrumbLabel)
      : page.breadcrumbLabel,
    sitemapChangeFreq: page.sitemapChangeFreq
      ? decodeHtmlEntities(page.sitemapChangeFreq)
      : page.sitemapChangeFreq,
    bodyContentPosition: page.bodyContentPosition
      ? decodeHtmlEntities(page.bodyContentPosition)
      : page.bodyContentPosition,
    internalNotes: page.internalNotes ? decodeHtmlEntities(page.internalNotes) : page.internalNotes,
  };
}

function decodeSettingsText(settings: SeoSettings): SeoSettings {
  return {
    ...settings,
    siteUrl: decodeHtmlEntities(settings.siteUrl),
    siteName: decodeHtmlEntities(settings.siteName),
    titleTemplate: decodeHtmlEntities(settings.titleTemplate),
    defaultTitle: decodeHtmlEntities(settings.defaultTitle),
    defaultDescription: decodeHtmlEntities(settings.defaultDescription),
    defaultKeywords: settings.defaultKeywords
      ? decodeHtmlEntities(settings.defaultKeywords)
      : settings.defaultKeywords,
    defaultOgImage: settings.defaultOgImage
      ? decodeHtmlEntities(settings.defaultOgImage)
      : settings.defaultOgImage,
    twitterHandle: settings.twitterHandle
      ? decodeHtmlEntities(settings.twitterHandle)
      : settings.twitterHandle,
    organizationName: settings.organizationName
      ? decodeHtmlEntities(settings.organizationName)
      : settings.organizationName,
    organizationLogo: settings.organizationLogo
      ? decodeHtmlEntities(settings.organizationLogo)
      : settings.organizationLogo,
    organizationPhone: settings.organizationPhone
      ? decodeHtmlEntities(settings.organizationPhone)
      : settings.organizationPhone,
    organizationEmail: settings.organizationEmail
      ? decodeHtmlEntities(settings.organizationEmail)
      : settings.organizationEmail,
    organizationAddress: settings.organizationAddress
      ? decodeHtmlEntities(settings.organizationAddress)
      : settings.organizationAddress,
    organizationCity: settings.organizationCity
      ? decodeHtmlEntities(settings.organizationCity)
      : settings.organizationCity,
    organizationRegion: settings.organizationRegion
      ? decodeHtmlEntities(settings.organizationRegion)
      : settings.organizationRegion,
    organizationPostal: settings.organizationPostal
      ? decodeHtmlEntities(settings.organizationPostal)
      : settings.organizationPostal,
  };
}

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
    if (settings) return decodeSettingsText(settings);

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
    const page = await prisma.seoPage.findUnique({ where: { path: normalized } });
    return page ? decodePageTextFields(page) : null;
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
    }).then((rows) =>
      rows.map((r) => ({
        ...r,
        sourcePath: normalizeSeoPath(decodeHtmlEntities(r.sourcePath)),
        destinationPath: r.destinationPath.startsWith("http")
          ? decodeHtmlEntities(r.destinationPath)
          : normalizeSeoPath(decodeHtmlEntities(r.destinationPath)),
      }))
    );
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
