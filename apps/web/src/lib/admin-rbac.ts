import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import {
  normalizeAdminRole,
  resolveAdminRole,
  resolveAdminAccess,
  isBillingAssistantPath,
  BILLING_ASSISTANT_ALLOWED_PATHS,
  type AdminRole,
} from "@/lib/admin-roles";

export {
  normalizeAdminRole,
  resolveAdminRole,
  resolveAdminAccess,
  isBillingAssistantPath,
  BILLING_ASSISTANT_ALLOWED_PATHS,
};
export type { AdminRole };

export type AdminAuthContext = {
  authenticated: true;
  adminId: string | null;
  email: string | null;
  actor: string;
  role: AdminRole;
};

export async function verifyAdminAuthWithRole(request?: NextRequest): Promise<
  | AdminAuthContext
  | { authenticated: false; error: string; code?: string }
> {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return {
      authenticated: false,
      error: auth.error || "Unauthorized",
      code: auth.code,
    };
  }
  return {
    authenticated: true,
    adminId: auth.adminId ?? null,
    email: auth.email ?? null,
    actor: auth.actor || "admin",
    role: auth.role || "OWNER",
  };
}

/** Owner-only admin APIs (refunds, integrations connect, user mgmt, etc.). */
export async function requireOwnerAdmin(request: NextRequest): Promise<
  | { ok: true; auth: AdminAuthContext }
  | { ok: false; response: NextResponse }
> {
  const auth = await verifyAdminAuthWithRole(request);
  if (!auth.authenticated) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: auth.error || "Unauthorized",
          code: auth.code || "UNAUTHORIZED",
        },
        { status: auth.code === "FORBIDDEN_ROLE" ? 403 : 401 }
      ),
    };
  }
  if (auth.role !== "OWNER") {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Owner access required for this action.",
          code: "FORBIDDEN_ROLE",
        },
        { status: 403 }
      ),
    };
  }
  return { ok: true, auth };
}

/** Any admin (OWNER or BILLING_ASSISTANT) for billing APIs. */
export async function requireBillingAdmin(request: NextRequest): Promise<
  | { ok: true; auth: AdminAuthContext }
  | { ok: false; response: NextResponse }
> {
  const auth = await verifyAdminAuthWithRole(request);
  if (!auth.authenticated) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: auth.error || "Unauthorized",
          code: auth.code || "UNAUTHORIZED",
        },
        { status: auth.code === "FORBIDDEN_ROLE" ? 403 : 401 }
      ),
    };
  }
  return { ok: true, auth };
}
