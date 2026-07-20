import type { MetadataRoute } from "next";
import { getSeoSettings } from "@/lib/seo-config";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSeoSettings();
  const siteUrl = settings.siteUrl.replace(/\/$/, "");

  const rules: MetadataRoute.Robots["rules"] = {
    userAgent: "*",
    allow: "/",
    disallow: [
      "/api/",
      "/_next/",
      "/admin/",
      "/seopanel/",
      "/operational-manager/",
      "/driver/",
    ],
  };

  // Parse extra Disallow + Allow rules from SEO panel
  if (settings.robotsExtraRules) {
    const lines = settings.robotsExtraRules
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const extraDisallow = lines
      .filter((line) => line.toLowerCase().startsWith("disallow:"))
      .map((line) => line.replace(/^disallow:\s*/i, "").trim())
      .filter(Boolean);

    const extraAllow = lines
      .filter((line) => line.toLowerCase().startsWith("allow:"))
      .map((line) => line.replace(/^allow:\s*/i, "").trim())
      .filter(Boolean);

    if (extraDisallow.length > 0) {
      const existing = Array.isArray(rules.disallow)
        ? rules.disallow
        : rules.disallow
          ? [rules.disallow]
          : [];
      rules.disallow = [...existing, ...extraDisallow];
    }

    if (extraAllow.length > 0) {
      const existingAllow = Array.isArray(rules.allow)
        ? rules.allow
        : rules.allow
          ? [rules.allow]
          : [];
      rules.allow = [...existingAllow, ...extraAllow];
    }
  }

  return {
    rules,
    sitemap: settings.sitemapEnabled ? `${siteUrl}/sitemap.xml` : undefined,
    host: siteUrl,
  };
}
