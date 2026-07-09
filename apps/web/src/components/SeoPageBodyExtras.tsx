import { headers } from "next/headers";
import { getSeoPageByPath } from "@/lib/seo-config";
import { normalizeSeoPath } from "@/lib/seo-pages";

/** Per-page body scripts + optional injected body content from SEO panel (DB) */
export default async function SeoPageBodyExtras() {
  const headerList = await headers();
  const pathname = normalizeSeoPath(headerList.get("x-pathname") || "/");
  if (pathname.startsWith("/seopanel") || pathname.startsWith("/api")) return null;
  const page = await getSeoPageByPath(pathname);
  if (!page) return null;

  const hasScripts = !!page.bodyScripts?.trim();
  const hasContent = !!page.bodyContentHtml?.trim();
  if (!hasScripts && !hasContent) return null;

  return (
    <>
      {page.bodyContentPosition === "top" && hasContent && (
        <div className="prose prose-sm sm:prose max-w-none" dangerouslySetInnerHTML={{ __html: page.bodyContentHtml! }} />
      )}
      {hasScripts && <div dangerouslySetInnerHTML={{ __html: page.bodyScripts! }} />}
      {page.bodyContentPosition !== "top" && hasContent && (
        <div className="prose prose-sm sm:prose max-w-none" dangerouslySetInnerHTML={{ __html: page.bodyContentHtml! }} />
      )}
    </>
  );
}
