import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

/** Days a self-deactivated account can be restored by the customer. */
export const CUSTOMER_REACTIVATE_WINDOW_DAYS = 30;

export type CustomerTokenPayload = {
  id: string;
  email: string;
  type: "customer";
};

export function normalizeAccountStatus(status?: string | null): string {
  return String(status || "ACTIVE").toUpperCase();
}

export function isCustomerBlocked(customer: { accountStatus?: string | null }): boolean {
  return normalizeAccountStatus(customer.accountStatus) === "BLOCKED";
}

export function isCustomerDeactivated(customer: { accountStatus?: string | null }): boolean {
  return normalizeAccountStatus(customer.accountStatus) === "DEACTIVATED";
}

/** Blocked or deactivated — not allowed to use the app. */
export function isCustomerInactive(customer: { accountStatus?: string | null }): boolean {
  const status = normalizeAccountStatus(customer.accountStatus);
  return status === "BLOCKED" || status === "DEACTIVATED";
}

export function blockedCustomerResponse() {
  return {
    success: false as const,
    error: "Your account has been blocked. Please contact support.",
    code: "ACCOUNT_BLOCKED" as const,
  };
}

export function deactivatedCustomerResponse(opts?: {
  canReactivate?: boolean;
  reactivatesUntil?: string | null;
}) {
  return {
    success: false as const,
    error: opts?.canReactivate
      ? "Your account is deactivated. You can reactivate it within the recovery window."
      : "Your account has been deactivated. Please contact support if you need help.",
    code: "ACCOUNT_DEACTIVATED" as const,
    canReactivate: !!opts?.canReactivate,
    reactivatesUntil: opts?.reactivatesUntil ?? null,
  };
}

export function getReactivateDeadline(deactivatedAt: Date | null | undefined): Date | null {
  if (!deactivatedAt) return null;
  const d = new Date(deactivatedAt);
  d.setDate(d.getDate() + CUSTOMER_REACTIVATE_WINDOW_DAYS);
  return d;
}

export function canCustomerSelfReactivate(customer: {
  accountStatus?: string | null;
  deactivatedAt?: Date | null;
  oauthProvider?: string | null;
}): { ok: boolean; until: Date | null } {
  if (!isCustomerDeactivated(customer)) return { ok: false, until: null };
  // OAuth-only accounts restore via support/admin (no user-known password).
  if (customer.oauthProvider) return { ok: false, until: null };
  const until = getReactivateDeadline(customer.deactivatedAt);
  if (!until) return { ok: false, until: null };
  return { ok: until.getTime() > Date.now(), until };
}

/** Shared 403 payload when account is blocked or deactivated. */
export function customerInactiveHttpResponse(customer: {
  accountStatus?: string | null;
  deactivatedAt?: Date | null;
  oauthProvider?: string | null;
}):
  | {
      status: 403;
      body:
        | ReturnType<typeof blockedCustomerResponse>
        | ReturnType<typeof deactivatedCustomerResponse>;
    }
  | null {
  if (isCustomerBlocked(customer)) {
    return { status: 403, body: blockedCustomerResponse() };
  }
  if (isCustomerDeactivated(customer)) {
    const { ok, until } = canCustomerSelfReactivate(customer);
    return {
      status: 403,
      body: deactivatedCustomerResponse({
        canReactivate: ok,
        reactivatesUntil: until?.toISOString() ?? null,
      }),
    };
  }
  return null;
}

export function verifyCustomerJwt(token: string): CustomerTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id?: string;
      email?: string;
      type?: string;
    };
    if (decoded.type !== "customer" || !decoded.id || !decoded.email) return null;
    return { id: decoded.id, email: decoded.email, type: "customer" };
  } catch {
    return null;
  }
}

export function getCustomerFromRequest(req: NextRequest): CustomerTokenPayload | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return verifyCustomerJwt(authHeader.slice(7).trim());
}

/** JWT + DB check — rejects blocked and deactivated accounts. */
export async function getActiveCustomerFromRequest(req: NextRequest) {
  const payload = getCustomerFromRequest(req);
  if (!payload) return { ok: false as const, reason: "unauthorized" as const };

  const customer = await prisma.customer.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, accountStatus: true, deactivatedAt: true },
  });
  if (!customer) return { ok: false as const, reason: "unauthorized" as const };
  if (isCustomerBlocked(customer)) return { ok: false as const, reason: "blocked" as const };
  if (isCustomerDeactivated(customer)) return { ok: false as const, reason: "deactivated" as const };

  return { ok: true as const, customer: { id: customer.id, email: customer.email } };
}

export type CustomerAuthFailReason = "unauthorized" | "blocked" | "deactivated";

/** JSON body + HTTP status for failed getActiveCustomerFromRequest. */
export function customerAuthFailurePayload(reason: CustomerAuthFailReason) {
  if (reason === "blocked") {
    return { status: 403 as const, body: blockedCustomerResponse() };
  }
  if (reason === "deactivated") {
    return {
      status: 403 as const,
      body: deactivatedCustomerResponse({ canReactivate: false }),
    };
  }
  return {
    status: 401 as const,
    body: { success: false as const, error: "Unauthorized" },
  };
}
