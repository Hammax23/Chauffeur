import "server-only";
import prisma from "@/lib/prisma";

export const ADMIN_ROLES = ["OWNER", "BILLING_ASSISTANT"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** Routes Billing Assistants may access (prefix match). */
export const BILLING_ASSISTANT_ALLOWED_PATHS = [
  "/admin/billing",
  "/api/admin/billing",
  "/api/admin/auth",
] as const;

export function normalizeAdminRole(raw?: string | null): AdminRole {
  const r = String(raw || "OWNER").trim().toUpperCase();
  return r === "BILLING_ASSISTANT" ? "BILLING_ASSISTANT" : "OWNER";
}

export function isBillingAssistantPath(pathname: string): boolean {
  const p = (pathname || "").split("?")[0] || "";
  return BILLING_ASSISTANT_ALLOWED_PATHS.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`)
  );
}

export type AdminAccess =
  | { ok: true; role: AdminRole }
  | { ok: false; reason: "INACTIVE" | "NOT_FOUND" };

/**
 * Resolve role for an AdminUser id.
 * Legacy tokens without adminId → OWNER (env single-admin).
 * Missing/deactivated AdminUser → NOT ok (must not fall back to OWNER).
 */
export async function resolveAdminAccess(
  adminId: string | null | undefined
): Promise<AdminAccess> {
  if (!adminId) return { ok: true, role: "OWNER" };
  try {
    const row = await prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { role: true, isActive: true },
    });
    if (!row) return { ok: false, reason: "NOT_FOUND" };
    if (!row.isActive) return { ok: false, reason: "INACTIVE" };
    return { ok: true, role: normalizeAdminRole(row.role) };
  } catch {
    return { ok: false, reason: "NOT_FOUND" };
  }
}

/** @deprecated Prefer resolveAdminAccess — this wrongly treated inactive as OWNER historically. */
export async function resolveAdminRole(
  adminId: string | null | undefined
): Promise<AdminRole> {
  const access = await resolveAdminAccess(adminId);
  return access.ok ? access.role : "OWNER";
}
