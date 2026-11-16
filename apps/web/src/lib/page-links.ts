import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";

export interface PageLinkView {
  id: string;
  pagePath: string;
  phrase: string;
  url: string;
  occurrence: number;
  newTab: boolean;
  kind: string;
  removeLink: boolean;
  newText: string | null;
  isActive: boolean;
}

export const PAGE_LINKS_TAG = "page-links";

/** "/About/ " -> "/About", "" -> "/", drops query and hash. */
export function normalizePagePath(input: string): string {
  let p = (input || "").trim().split("#")[0].split("?")[0];
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p || "/";
}

/** All active text links; cached and refreshed whenever the SEO panel changes a link. */
export const getActivePageLinks = unstable_cache(
  async (): Promise<PageLinkView[]> => {
    try {
      return await prisma.pageLink.findMany({
        where: { isActive: true },
        select: { id: true, pagePath: true, phrase: true, url: true, occurrence: true, newTab: true, kind: true, removeLink: true, newText: true, isActive: true },
        orderBy: { createdAt: "asc" },
      });
    } catch {
      return [];
    }
  },
  ["active-page-links"],
  { tags: [PAGE_LINKS_TAG], revalidate: 3600 }
);
