import prisma from "@/lib/prisma";

export interface ServiceLinkView {
  id: string;
  serviceSlug: string;
  label: string;
  url: string;
  isActive: boolean;
  sortOrder: number;
}

/** Active internal links for a service page (safe: returns [] if the table/DB is unavailable). */
export async function getActiveServiceLinks(serviceSlug: string): Promise<ServiceLinkView[]> {
  try {
    return await prisma.serviceLink.findMany({
      where: { serviceSlug, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, serviceSlug: true, label: true, url: true, isActive: true, sortOrder: true },
    });
  } catch {
    return [];
  }
}
