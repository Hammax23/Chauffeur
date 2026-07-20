import { headers } from "next/headers";
import { getSeoPageByPath } from "@/lib/seo-config";
import { normalizeSeoPath } from "@/lib/seo-pages";

/**
 * SSR per-page JSON-LD + header scripts so crawlers see them in initial HTML.
 * Soft navigations are handled by SeoPageHeadLive (client).
 */
export default async function SeoPageServerHead() {
  const headerList = await headers();
  const pathname = normalizeSeoPath(headerList.get("x-pathname") || "/");
  if (
    pathname.startsWith("/seopanel") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/operational-manager")
  ) {
    return null;
  }

  const page = await getSeoPageByPath(pathname);
  if (!page) return null;

  return (
    <>
      {page.schemaJson != null ? (
        <script
          type="application/ld+json"
          data-seo-ssr-head="1"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(page.schemaJson) }}
        />
      ) : null}
      {page.headerScripts?.trim() ? (
        <div data-seo-ssr-head="1" dangerouslySetInnerHTML={{ __html: page.headerScripts }} />
      ) : null}
    </>
  );
}
