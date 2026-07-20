/**
 * Shared secret for middleware ↔ /api/seo-redirects.
 * Must match seo-auth JWT fallback so redirects work even without JWT_SECRET in local/dev.
 */
export function getSeoRedirectsInternalSecret(): string {
  return (
    process.env.SEO_REDIRECTS_INTERNAL_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    "sarj-admin-jwt-secret-key-2024-secure"
  );
}
