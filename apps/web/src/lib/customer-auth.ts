import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

export type CustomerTokenPayload = {
  id: string;
  email: string;
  type: "customer";
};

export function isCustomerBlocked(customer: { accountStatus?: string | null }): boolean {
  return String(customer.accountStatus || "ACTIVE").toUpperCase() === "BLOCKED";
}

export function blockedCustomerResponse() {
  return {
    success: false as const,
    error: "Your account has been blocked. Please contact support.",
    code: "ACCOUNT_BLOCKED" as const,
  };
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

/** JWT + DB check — rejects blocked accounts. */
export async function getActiveCustomerFromRequest(req: NextRequest) {
  const payload = getCustomerFromRequest(req);
  if (!payload) return { ok: false as const, reason: "unauthorized" as const };

  const customer = await prisma.customer.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, accountStatus: true },
  });
  if (!customer) return { ok: false as const, reason: "unauthorized" as const };
  if (isCustomerBlocked(customer)) return { ok: false as const, reason: "blocked" as const };

  return { ok: true as const, customer: { id: customer.id, email: customer.email } };
}
