import prisma from "@/lib/prisma";
import { REGIONS } from "@/data/regions";

export interface CityRecord {
  id?: string;
  slug: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
  description?: string | null;
  source: "db" | "static";
}

function staticCities(): CityRecord[] {
  return REGIONS.map((r, index) => ({
    slug: r.slug,
    label: r.label,
    isActive: true,
    sortOrder: index,
    source: "static" as const,
  }));
}

export async function getAllCities(includeInactive = false): Promise<CityRecord[]> {
  try {
    const dbCities = await prisma.managedCity.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] });
    if (dbCities.length === 0) {
      const staticList = staticCities();
      return includeInactive ? staticList : staticList.filter((c) => c.isActive);
    }

    const list: CityRecord[] = dbCities.map((c) => ({
      id: c.id,
      slug: c.slug,
      label: c.label,
      isActive: c.isActive,
      sortOrder: c.sortOrder,
      description: c.description,
      source: "db" as const,
    }));

    return includeInactive ? list : list.filter((c) => c.isActive);
  } catch {
    const staticList = staticCities();
    return includeInactive ? staticList : staticList.filter((c) => c.isActive);
  }
}

export async function getCityBySlug(slug: string, includeInactive = false): Promise<CityRecord | null> {
  const cities = await getAllCities(true);
  const city = cities.find((c) => c.slug === slug) ?? null;
  if (!city) return null;
  if (!includeInactive && !city.isActive) return null;
  return city;
}

export async function getAllCitySlugs(): Promise<string[]> {
  const cities = await getAllCities();
  return cities.map((c) => c.slug);
}

export async function getCityDisplayName(slug: string): Promise<string> {
  const city = await getCityBySlug(slug);
  if (!city) return slug;
  return city.label
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function seedCitiesFromStatic(): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (const [index, region] of REGIONS.entries()) {
    const existing = await prisma.managedCity.findUnique({ where: { slug: region.slug } });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.managedCity.create({
      data: {
        slug: region.slug,
        label: region.label,
        isActive: true,
        sortOrder: index,
      },
    });
    created++;
  }

  return { created, skipped };
}
