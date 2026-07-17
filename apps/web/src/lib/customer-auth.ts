import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

export type CustomerTokenPayload = {
  id: string;
  email: string;
  type: "customer";
};

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
