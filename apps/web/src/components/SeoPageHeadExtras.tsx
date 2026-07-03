import { headers } from "next/headers";
import { getSeoPageByPath } from "@/lib/seo-config";
import { normalizeSeoPath } from "@/lib/seo-pages";

/** Per-page JSON-LD + header scripts from SEO panel (DB) */
export default async function SeoPageHeadExtras() {
  const headerList = await headers();
  const pathname = normalizeSeoPath(headerList.get("x-pathname") || "/");
  const page = await getSeoPageByPath(pathname);
  if (!page) return null;

  return (
    <>
      {page.schemaJson != null && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(page.schemaJson) }}
        />
      )}
      {page.headerScripts?.trim() && (
        <div dangerouslySetInnerHTML={{ __html: page.headerScripts }} />
      )}
    </>
  );
}
