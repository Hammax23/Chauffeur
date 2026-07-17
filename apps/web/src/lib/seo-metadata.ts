import type { Metadata } from "next";
import { getSeoSettings, getSeoPageByPath } from "@/lib/seo-config";
import { normalizeSeoPath } from "@/lib/seo-pages";

interface PageMetadataDefaults {
  title?: string;
  description?: string;
  keywords?: string[];
  path?: string;
}

/** Build Next.js Metadata from DB SEO settings + per-page overrides */
export async function buildPageMetadata(
  path: string,
  defaults: PageMetadataDefaults = {}
): Promise<Metadata> {
  const normalizedPath = normalizeSeoPath(path);
  const [settings, page] = await Promise.all([
    getSeoSettings(),
    getSeoPageByPath(normalizedPath),
  ]);

  const siteUrl = settings.siteUrl.replace(/\/$/, "");
  const title = page?.title || defaults.title || settings.defaultTitle;
  const description = page?.metaDescription || defaults.description || settings.defaultDescription;
  const keywordsRaw = page?.keywords || settings.defaultKeywords;
  const keywords = keywordsRaw
    ? keywordsRaw.split(",").map((k) => k.trim()).filter(Boolean)
    : defaults.keywords;

  const canonical = page?.canonicalUrl || `${siteUrl}${normalizedPath === "/" ? "" : normalizedPath}`;
  const ogImage = page?.ogImage || settings.defaultOgImage || `${siteUrl}/logo1.png`;
  const ogTitle = page?.ogTitle || title;
  const ogDescription = page?.ogDescription || description;
  const twitterTitle = page?.twitterTitle || ogTitle;
  const twitterDescription = page?.twitterDescription || ogDescription;
  const twitterImage = page?.twitterImage || ogImage;

  const robotsIndex = page?.robotsIndex ?? true;
  const robotsFollow = page?.robotsFollow ?? true;

  const verification: Metadata["verification"] = {};
  if (settings.googleVerification) verification.google = settings.googleVerification;
  if (settings.bingVerification) verification.other = { "msvalidate.01": settings.bingVerification };
  if (settings.yandexVerification) {
    verification.yandex = settings.yandexVerification;
  }

  // Use absolute title so root title.template does not double-append brand
  return {
    title: { absolute: title },
    description,
    keywords: keywords?.length ? keywords : undefined,
    authors: [{ name: settings.siteName }],
    creator: settings.organizationName ?? settings.siteName,
    publisher: settings.siteName,
    robots: {
      index: robotsIndex,
      follow: robotsFollow,
      noarchive: page?.noarchive ?? false,
      nosnippet: page?.nosnippet ?? false,
      googleBot: {
        index: robotsIndex,
        follow: robotsFollow,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "en_CA",
      url: canonical,
      siteName: settings.siteName,
      title: ogTitle ?? undefined,
      description: ogDescription ?? undefined,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: settings.siteName }] : undefined,
    },
    twitter: {
      card: (settings.twitterCardType as "summary" | "summary_large_image") || "summary_large_image",
      title: twitterTitle ?? undefined,
      description: twitterDescription ?? undefined,
      images: twitterImage ? [twitterImage] : undefined,
      creator: settings.twitterHandle ?? undefined,
    },
    verification: Object.keys(verification).length ? verification : undefined,
  };
}

/** Global metadata for root layout */
export async function buildGlobalMetadata(): Promise<Metadata> {
  const settings = await getSeoSettings();
  const base = await buildPageMetadata("/", {
    title: settings.defaultTitle,
    description: settings.defaultDescription,
  });

  return {
    ...base,
    title: {
      default: settings.defaultTitle,
      template: settings.titleTemplate,
    },
    metadataBase: new URL(settings.siteUrl),
  };
}
