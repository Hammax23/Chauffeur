import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import {
  checkRateLimit,
  recordFailedAttempt,
  clearAttempts,
  getClientIP,
  verifyPassword,
} from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "sarj-admin-jwt-secret-key-2024-secure";
const TOKEN_EXPIRY = "24h";

export const OPERATIONAL_MANAGER_COOKIE_NAME = "sarj_operational_manager_token";

export interface OperationalManagerTokenPayload {
  role: "operational_manager";
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

export function generateOperationalManagerToken(id: string, email: string): string {
  return jwt.sign({ role: "operational_manager", sub: id, email }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
}

export function verifyOperationalManagerToken(token: string): OperationalManagerTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as OperationalManagerTokenPayload;
    if (decoded.role !== "operational_manager" || !decoded.sub) return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Login against DB records created by admin. Email is case-insensitive.
 */
export async function authenticateOperationalManager(
  emailRaw: string,
  password: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !password) {
    return { success: false, error: "Email and password are required" };
  }

  const record = await prisma.operationalManager.findUnique({
    where: { email },
  });

  if (!record || !record.isActive) {
    return { success: false, error: "Invalid email or password" };
  }

  const ok = await verifyPassword(password, record.password);
  if (!ok) {
    return { success: false, error: "Invalid email or password" };
  }

  return { success: true, token: generateOperationalManagerToken(record.id, record.email) };
}

export async function getOperationalManagerTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(OPERATIONAL_MANAGER_COOKIE_NAME)?.value ?? null;
}

export async function verifyOperationalManagerAuth(
  request?: NextRequest
): Promise<{ authenticated: boolean; error?: string }> {
  let token: string | null = null;

  if (request) {
    token = request.cookies.get(OPERATIONAL_MANAGER_COOKIE_NAME)?.value ?? null;
    if (!token) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }
  } else {
    token = await getOperationalManagerTokenFromCookies();
  }

  if (!token) {
    return { authenticated: false, error: "No authentication token" };
  }

  const payload = verifyOperationalManagerToken(token);
  if (!payload) {
    return { authenticated: false, error: "Invalid or expired token" };
  }

  const record = await prisma.operationalManager.findUnique({
    where: { id: payload.sub },
    select: { id: true, isActive: true },
  });

  if (!record || !record.isActive) {
    return { authenticated: false, error: "Account disabled or removed" };
  }

  return { authenticated: true };
}

export { checkRateLimit, recordFailedAttempt, clearAttempts, getClientIP };
