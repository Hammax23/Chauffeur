import "server-only";

/**
 * Shared JWT secret for customer / driver / concierge / OTP.
 * Production: fail closed if unset (do not use hardcoded fallbacks).
 * Dev: allow a local fallback so `npm run dev` still works.
 *
 * Note: admin JWT expiry / default password hash left unchanged per product request.
 */
export function getAppJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  return "dev-only-fallback-secret-key";
}
