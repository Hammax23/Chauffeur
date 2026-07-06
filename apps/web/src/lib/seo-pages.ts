import { services } from "@/data/services";
import { REGIONS } from "@/data/regions";
import { getDiscoveredBlogPages } from "@/lib/blog";

export interface DiscoveredPage {
  path: string;
  pageType: "static" | "service" | "city" | "legal" | "utility" | "blog";
  pageLabel: string;
  defaultTitle?: string;
  defaultDescription?: string;
}

const STATIC_PAGES: DiscoveredPage[] = [
  { path: "/", pageType: "static", pageLabel: "Homepage", defaultTitle: "SARJ Worldwide Chauffeur Services | Premium Luxury Transportation" },
  { path: "/about", pageType: "static", pageLabel: "About Us" },
  { path: "/fleet", pageType: "static", pageLabel: "Fleet" },
  { path: "/services", pageType: "static", pageLabel: "Services" },
  { path: "/cities-we-serve", pageType: "static", pageLabel: "Cities We Serve" },
  { path: "/contact", pageType: "static", pageLabel: "Contact" },
  { path: "/quote", pageType: "static", pageLabel: "Get a Quote" },
  { path: "/reservation", pageType: "utility", pageLabel: "Online Reservation" },
  { path: "/news", pageType: "static", pageLabel: "Blog" },
  { path: "/privacy-policy", pageType: "legal", pageLabel: "Privacy Policy" },
  { path: "/terms-of-service", pageType: "legal", pageLabel: "Terms of Service" },
];

/** All public pages discoverable for SEO management */
export async function discoverSitePages(): Promise<DiscoveredPage[]> {
  const servicePages: DiscoveredPage[] = services.map((s) => ({
    path: `/services/${s.slug}`,
    pageType: "service" as const,
    pageLabel: s.title,
    defaultTitle: `${s.title} | SARJ Worldwide Chauffeur`,
    defaultDescription: s.shortDesc,
  }));

  const cityPages: DiscoveredPage[] = REGIONS.map((r) => ({
    path: `/cities-we-serve/${r.slug}`,
    pageType: "city" as const,
    pageLabel: r.label,
    defaultTitle: `Chauffeur Service in ${r.label} | SARJ Worldwide`,
    defaultDescription: `Premium chauffeur and luxury transportation in ${r.label}. Airport transfers, corporate travel & VIP service.`,
  }));

  const blogPages = await getDiscoveredBlogPages();

  return [...STATIC_PAGES, ...blogPages, ...servicePages, ...cityPages];
}

export function normalizeSeoPath(path: string): string {
  let normalized = path.trim();
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

export function getPageTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    static: "Static Page",
    service: "Service Page",
    city: "City Page",
    legal: "Legal Page",
    utility: "Utility Page",
    blog: "Blog Post",
  };
  return labels[type] ?? type;
}

/** SEO health score 0–100 for a page record */
export function calculateSeoScore(page: {
  title?: string | null;
  metaDescription?: string | null;
  focusKeyword?: string | null;
  ogImage?: string | null;
  canonicalUrl?: string | null;
  h1?: string | null;
  schemaJson?: unknown;
}): number {
  let score = 0;
  const title = page.title?.trim() ?? "";
  const desc = page.metaDescription?.trim() ?? "";

  if (title.length >= 30 && title.length <= 65) score += 20;
  else if (title.length > 0) score += 10;

  if (desc.length >= 120 && desc.length <= 160) score += 20;
  else if (desc.length > 0) score += 10;

  if (page.focusKeyword?.trim()) score += 15;
  if (page.h1?.trim()) score += 10;
  if (page.ogImage?.trim()) score += 15;
  if (page.canonicalUrl?.trim()) score += 10;
  if (page.schemaJson) score += 10;

  return Math.min(100, score);
}
