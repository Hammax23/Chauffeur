import prisma from "@/lib/prisma";
import { services, type Service, type ServiceIconKey } from "@/data/services";

export interface ServiceRecord extends Service {
  id?: string;
  isActive: boolean;
  sortOrder: number;
  source: "db" | "static";
}

const VALID_ICONS: ServiceIconKey[] = [
  "PlaneTakeoff", "Building2", "Route", "Timer", "Gem", "Landmark",
  "Handshake", "ShieldCheck", "Car", "CarFront", "PhoneCall",
];

function normalizeIcon(icon: string): ServiceIconKey {
  return VALID_ICONS.includes(icon as ServiceIconKey) ? (icon as ServiceIconKey) : "Car";
}

function staticServices(): ServiceRecord[] {
  return services.map((s, index) => ({
    ...s,
    isActive: true,
    sortOrder: index,
    source: "static" as const,
  }));
}

function mapDbService(row: {
  id: string;
  slug: string;
  title: string;
  shortDesc: string;
  description: string;
  features: unknown;
  icon: string;
  isActive: boolean;
  sortOrder: number;
}): ServiceRecord {
  const features = Array.isArray(row.features)
    ? row.features.filter((f): f is string => typeof f === "string")
    : [];

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDesc: row.shortDesc,
    description: row.description,
    features,
    icon: normalizeIcon(row.icon),
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    source: "db",
  };
}

async function getRawServices(): Promise<ServiceRecord[]> {
  try {
    const dbServices = await prisma.managedService.findMany({ orderBy: [{ sortOrder: "asc" }, { title: "asc" }] });
    return dbServices.length === 0 ? staticServices() : dbServices.map(mapDbService);
  } catch {
    return staticServices();
  }
}

/**
 * Service list for the public site and the SEO panel. Titles, copy and order always come
 * from data/services.ts so every environment matches; the database only supplies the row id
 * and whether a built-in service is switched on. Database-only rows are ignored.
 */
export async function getAllServices(includeInactive = false): Promise<ServiceRecord[]> {
  const raw = await getRawServices();
  const rows = new Map(raw.map((r) => [r.slug, r]));
  const list = staticServices().map((s) => {
    const row = rows.get(s.slug);
    return row ? { ...s, id: row.id, isActive: row.isActive } : s;
  });
  return includeInactive ? list : list.filter((s) => s.isActive);
}

export async function getServiceBySlug(slug: string): Promise<ServiceRecord | undefined> {
  const all = await getAllServices();
  return all.find((s) => s.slug === slug);
}

export async function getAllServiceSlugs(): Promise<string[]> {
  const list = await getAllServices();
  return list.map((s) => s.slug);
}

export async function seedServicesFromStatic(): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (const [index, service] of services.entries()) {
    const existing = await prisma.managedService.findUnique({ where: { slug: service.slug } });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.managedService.create({
      data: {
        slug: service.slug,
        title: service.title,
        shortDesc: service.shortDesc,
        description: service.description,
        features: service.features,
        icon: service.icon,
        isActive: true,
        sortOrder: index,
      },
    });
    created++;
  }

  return { created, skipped };
}

export { VALID_ICONS as SERVICE_ICON_OPTIONS };
