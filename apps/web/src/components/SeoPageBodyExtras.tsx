import { headers } from "next/headers";
import { getSeoPageByPath } from "@/lib/seo-config";
import { normalizeSeoPath } from "@/lib/seo-pages";

/** Per-page body scripts from SEO panel (DB) */
export default async function SeoPageBodyExtras() {
  const headerList = await headers();
  const pathname = normalizeSeoPath(headerList.get("x-pathname") || "/");
  const page = await getSeoPageByPath(pathname);
  if (!page?.bodyScripts?.trim()) return null;

  return <div dangerouslySetInnerHTML={{ __html: page.bodyScripts }} />;
}
