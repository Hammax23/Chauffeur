import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySeoPanelAuth } from "@/lib/seo-auth";
import { getSeoSettings } from "@/lib/seo-config";
import { sanitizeInput } from "@/lib/sanitize";

export async function GET(request: NextRequest) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSeoSettings();
  return NextResponse.json({ success: true, settings });
}

export async function PUT(request: NextRequest) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const str = (key: string) => (body[key] != null ? sanitizeInput(String(body[key])) : undefined);
    const bool = (key: string) => (typeof body[key] === "boolean" ? body[key] : undefined);
    const num = (key: string) => (typeof body[key] === "number" ? body[key] : undefined);

    const settings = await prisma.seoSettings.upsert({
      where: { id: "global" },
      create: {
        id: "global",
        siteUrl: str("siteUrl") || "https://sarjworldwide.ca",
        siteName: str("siteName") || "SARJ Worldwide Chauffeur Services",
        titleTemplate: str("titleTemplate") || "%s | SARJ Worldwide Chauffeur",
        defaultTitle: str("defaultTitle") || "",
        defaultDescription: str("defaultDescription") || "",
      },
      update: {
        ...(str("siteUrl") !== undefined && { siteUrl: str("siteUrl") }),
        ...(str("siteName") !== undefined && { siteName: str("siteName") }),
        ...(str("titleTemplate") !== undefined && { titleTemplate: str("titleTemplate") }),
        ...(str("defaultTitle") !== undefined && { defaultTitle: str("defaultTitle") }),
        ...(str("defaultDescription") !== undefined && { defaultDescription: str("defaultDescription") }),
        ...(str("defaultKeywords") !== undefined && { defaultKeywords: str("defaultKeywords") || null }),
        ...(str("defaultOgImage") !== undefined && { defaultOgImage: str("defaultOgImage") || null }),
        ...(str("twitterHandle") !== undefined && { twitterHandle: str("twitterHandle") || null }),
        ...(str("twitterCardType") !== undefined && { twitterCardType: str("twitterCardType") }),
        ...(str("googleVerification") !== undefined && { googleVerification: str("googleVerification") || null }),
        ...(str("bingVerification") !== undefined && { bingVerification: str("bingVerification") || null }),
        ...(str("yandexVerification") !== undefined && { yandexVerification: str("yandexVerification") || null }),
        ...(str("pinterestVerification") !== undefined && { pinterestVerification: str("pinterestVerification") || null }),
        ...(str("facebookAppId") !== undefined && { facebookAppId: str("facebookAppId") || null }),
        ...(str("ga4Id") !== undefined && { ga4Id: str("ga4Id") || null }),
        ...(str("gtmId") !== undefined && { gtmId: str("gtmId") || null }),
        ...(str("facebookPixelId") !== undefined && { facebookPixelId: str("facebookPixelId") || null }),
        ...(str("organizationName") !== undefined && { organizationName: str("organizationName") || null }),
        ...(str("organizationLogo") !== undefined && { organizationLogo: str("organizationLogo") || null }),
        ...(str("organizationPhone") !== undefined && { organizationPhone: str("organizationPhone") || null }),
        ...(str("organizationEmail") !== undefined && { organizationEmail: str("organizationEmail") || null }),
        ...(str("organizationAddress") !== undefined && { organizationAddress: str("organizationAddress") || null }),
        ...(str("organizationCity") !== undefined && { organizationCity: str("organizationCity") || null }),
        ...(str("organizationRegion") !== undefined && { organizationRegion: str("organizationRegion") || null }),
        ...(str("organizationPostal") !== undefined && { organizationPostal: str("organizationPostal") || null }),
        ...(str("organizationCountry") !== undefined && { organizationCountry: str("organizationCountry") || "CA" }),
        ...(body.localBusinessSchema !== undefined && { localBusinessSchema: body.localBusinessSchema }),
        ...(body.websiteSchema !== undefined && { websiteSchema: body.websiteSchema }),
        ...(str("robotsExtraRules") !== undefined && { robotsExtraRules: str("robotsExtraRules") || null }),
        ...(bool("sitemapEnabled") !== undefined && { sitemapEnabled: bool("sitemapEnabled") }),
        ...(str("defaultChangeFreq") !== undefined && { defaultChangeFreq: str("defaultChangeFreq") }),
        ...(num("defaultPriority") !== undefined && { defaultPriority: num("defaultPriority") }),
      },
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("[SEO Settings]", error);
    const msg = error instanceof Error ? error.message : "";
    const hint = msg.includes("does not exist") || msg.includes("SeoSettings")
      ? "Run npx prisma db push in apps/web to create SEO tables."
      : "Failed to save settings";
    return NextResponse.json({ success: false, error: hint }, { status: 500 });
  }
}
