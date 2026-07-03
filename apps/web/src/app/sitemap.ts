import { MetadataRoute } from "next";
import { getSitemapEntries, getSeoSettings } from "@/lib/seo-config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSeoSettings();
  if (!settings.sitemapEnabled) return [];

  const siteUrl = settings.siteUrl.replace(/\/$/, "");
  const entries = await getSitemapEntries();

  return entries.map((entry) => ({
    url: `${siteUrl}${entry.path === "/" ? "" : entry.path}`,
    lastModified: entry.lastModified,
    changeFrequency: entry.changeFrequency as MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: entry.priority,
  }));
}
