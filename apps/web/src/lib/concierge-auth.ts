import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

export interface ConciergeTokenPayload {
  id: string;
  email: string;
  hotelId: string;
  type: "concierge";
  iat: number;
  exp: number;
}

export function verifyConciergeJwt(token: string): ConciergeTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as ConciergeTokenPayload;
    if (decoded.type !== "concierge") return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function verifyConciergeToken(
  request: NextRequest
): Promise<ConciergeTokenPayload | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return verifyConciergeJwt(authHeader.split(" ")[1]);
}
