/**
 * Client + server safe allowlist for Billing Assistant.
 * Keep AdminLayout redirect/nav in sync with server gate in admin-roles.
 *
 * Reservation surface covered:
 * - Pages: reservations, custom-reservation, live-auto, quotes, billing
 * - Create custom booking: POST /api/reservation (skipTurnstile)
 * - Manage bookings: /api/admin/reservations/* (list/edit/delete/bulk-delete/assign/chat/checkout/mg-ops/fare-adjustment)
 * - Charge card on file: POST /api/stripe/charge
 * - Assign picker: GET /api/admin/drivers (not driver CRUD by id)
 */

function normalizePath(pathname: string): string {
  const raw = (pathname || "").split("?")[0] || "";
  if (raw.length > 1 && raw.endsWith("/")) return raw.slice(0, -1);
  return raw;
}

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
  // Custom Reservation create (skipTurnstile staff path) + checkout confirm helpers
  "/api/reservation",
] as const;

/**
 * Exact API paths only (no child routes).
 * - /api/admin/drivers → assign picker list (GET only; not driver CRUD by id)
 * - /api/stripe/charge → admin off-session charge from Reservations
 */
export const BILLING_ASSISTANT_API_EXACT = [
  "/api/admin/drivers",
  "/api/stripe/charge",
] as const;

export function isBillingAssistantPagePath(pathname: string): boolean {
  const p = normalizePath(pathname);
  return BILLING_ASSISTANT_PAGE_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`)
  );
}

/**
 * @param method HTTP method — used to keep Billing Assistant on GET-only for
 * `/api/admin/drivers` (assign picker) while blocking driver create POST.
 */
export function isBillingAssistantPath(
  pathname: string,
  method?: string | null
): boolean {
  const p = normalizePath(pathname);
  const m = String(method || "GET").toUpperCase();

  if (isBillingAssistantPagePath(p)) return true;

  // Exact-only APIs first (block /api/admin/drivers/:id mutations)
  if (p === "/api/admin/drivers") {
    return m === "GET" || m === "HEAD" || m === "OPTIONS";
  }
  if (p === "/api/stripe/charge") {
    return m === "POST" || m === "OPTIONS";
  }
  if ((BILLING_ASSISTANT_API_EXACT as readonly string[]).includes(p)) return true;
  if (p.startsWith("/api/admin/drivers/")) return false;

  return BILLING_ASSISTANT_API_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`)
  );
}
