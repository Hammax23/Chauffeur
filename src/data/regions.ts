export const REGIONS = [
  { label: "TORONTO PEARSON AIRPORT", slug: "toronto-pearson" },
  { label: "HAMILTON Airport", slug: "hamilton" },
  { label: "LONDON AIRPORT", slug: "london" },
  { label: "OTTAWA AIRPORT", slug: "ottawa" },
  { label: "MONTREAL", slug: "montreal" },
  { label: "NIAGARA/BUFFALO", slug: "niagara-buffalo" },
  { label: "OTTAWA/MONTREAL", slug: "ottawa-montreal" },
  { label: "GREATER TORONTO AREA", slug: "greater-toronto-area" },
] as const;

export type RegionSlug = (typeof REGIONS)[number]["slug"];

export function getRegionBySlug(slug: string): { label: string; slug: string } | null {
  const found = REGIONS.find((r) => r.slug === slug);
  return found ? { label: found.label, slug: found.slug } : null;
}

/** Display name for titles e.g. "United States" */
export function getRegionDisplayName(slug: string): string {
  const r = getRegionBySlug(slug);
  if (!r) return slug;
  return r.label
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function getAllRegionSlugs(): string[] {
  return REGIONS.map((r) => r.slug);
}
