import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

export interface DriverTokenPayload {
  id: string;
  email: string;
  type: "driver";
  iat: number;
  exp: number;
}

export function verifyDriverJwt(token: string): DriverTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DriverTokenPayload;
    if (decoded.type !== "driver") return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function verifyDriverToken(request: NextRequest): Promise<DriverTokenPayload | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  return verifyDriverJwt(token);
}

