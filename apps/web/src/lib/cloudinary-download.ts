/**
 * Same-origin admin proxy builds URLs so:
 * - Download: Content-Disposition attachment + proper filename
 * - View: Content-Disposition inline (browser PDF/image viewer)
 *
 * Direct Cloudinary links often force download or lack a filename; the proxy also sends
 * the admin cookie so fetch works reliably.
 */
function buildFilenameSuggestion(cloudinaryUrl: string, labelForFilename: string): { trimmed: string; suggested: string } {
  const trimmed = cloudinaryUrl.trim();
  const safe =
    labelForFilename
      .replace(/[^\w\s.-]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 80) || "document";

  let suggested = safe;
  if (!/\.(pdf|png|jpe?g|webp|gif)$/i.test(suggested)) {
    const lower = trimmed.toLowerCase();
    if (lower.includes("/raw/upload/")) suggested = `${safe}.pdf`;
    else if (lower.includes("/image/upload/")) suggested = `${safe}.jpg`;
    else suggested = `${safe}.pdf`;
  }

  return { trimmed, suggested };
}

export function adminDocumentDownloadHref(cloudinaryUrl: string, labelForFilename: string): string {
  const { trimmed, suggested } = buildFilenameSuggestion(cloudinaryUrl, labelForFilename);
  const params = new URLSearchParams();
  params.set("url", trimmed);
  params.set("filename", suggested);
  return `/api/admin/document-download?${params.toString()}`;
}

/** Opens in-tab preview (inline disposition); requires admin session cookie. */
export function adminDocumentViewHref(cloudinaryUrl: string, labelForFilename: string): string {
  const { trimmed, suggested } = buildFilenameSuggestion(cloudinaryUrl, labelForFilename);
  const params = new URLSearchParams();
  params.set("url", trimmed);
  params.set("filename", suggested);
  params.set("inline", "1");
  return `/api/admin/document-download?${params.toString()}`;
}
