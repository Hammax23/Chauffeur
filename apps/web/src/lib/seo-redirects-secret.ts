/**
 * Shared secret for middleware ↔ /api/seo-redirects.
 * Production: fail closed if unset. Dev: allow local fallback.
 */
export function getSeoRedirectsInternalSecret(): string {
  const secret =
    process.env.SEO_REDIRECTS_INTERNAL_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    "";
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SEO_REDIRECTS_INTERNAL_SECRET or JWT_SECRET is required in production"
    );
  }
  return "dev-seo-redirects-secret";
}
