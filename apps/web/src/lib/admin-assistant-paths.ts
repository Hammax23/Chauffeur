/**
 * Client + server safe allowlist for Billing Assistant.
 * Keep AdminLayout redirect/nav in sync with server gate in admin-roles.
 */

/** Admin UI pages Billing Assistants may open. */
export const BILLING_ASSISTANT_PAGE_PREFIXES = [
  "/admin/billing",
  "/admin/reservations",
  "/admin/live-auto",
  "/admin/custom-reservation",
  "/admin/quotes",
] as const;

/** Admin APIs Billing Assistants may call (prefix match, unless noted). */
export const BILLING_ASSISTANT_API_PREFIXES = [
  "/api/admin/billing",
  "/api/admin/reservations",
  "/api/admin/quotes",
  "/api/admin/ops-settings",
  "/api/admin/live-auto",
  "/api/admin/auth",
] as const;

/**
 * Exact API paths only (no child routes).
 * - /api/admin/drivers → assign picker list (not driver CRUD by id)
 * - /api/stripe/charge → admin off-session charge from Reservations
 */
export const BILLING_ASSISTANT_API_EXACT = [
  "/api/admin/drivers",
  "/api/stripe/charge",
] as const;

export function isBillingAssistantPagePath(pathname: string): boolean {
  const p = (pathname || "").split("?")[0] || "";
  return BILLING_ASSISTANT_PAGE_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`)
  );
}

export function isBillingAssistantPath(pathname: string): boolean {
  const p = (pathname || "").split("?")[0] || "";

  if (isBillingAssistantPagePath(p)) return true;

  // Exact-only APIs first (block /api/admin/drivers/:id mutations)
  if ((BILLING_ASSISTANT_API_EXACT as readonly string[]).includes(p)) return true;
  if (p.startsWith("/api/admin/drivers/")) return false;

  return BILLING_ASSISTANT_API_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`)
  );
}
