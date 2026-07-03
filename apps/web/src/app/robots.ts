import type { MetadataRoute } from "next";
import { getSitemapEntries, getSeoSettings } from "@/lib/seo-config";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSeoSettings();
  const siteUrl = settings.siteUrl.replace(/\/$/, "");

  const rules: MetadataRoute.Robots["rules"] = {
    userAgent: "*",
    allow: "/",
    disallow: ["/api/", "/_next/", "/admin/", "/seopanel/", "/operational-manager/"],
  };

  // Parse extra disallow rules from SEO panel
  if (settings.robotsExtraRules) {
    const extraDisallow = settings.robotsExtraRules
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.toLowerCase().startsWith("disallow:"))
      .map((line) => line.replace(/^disallow:\s*/i, "").trim())
      .filter(Boolean);

    if (extraDisallow.length > 0) {
      const existing = Array.isArray(rules.disallow) ? rules.disallow : rules.disallow ? [rules.disallow] : [];
      rules.disallow = [...existing, ...extraDisallow];
    }
  }

  return {
    rules,
    sitemap: settings.sitemapEnabled ? `${siteUrl}/sitemap.xml` : undefined,
    host: siteUrl,
  };
}
