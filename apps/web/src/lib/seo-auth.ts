import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import {
  checkRateLimit,
  recordFailedAttempt,
  clearAttempts,
  getClientIP,
} from "@/lib/admin-auth";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error("JWT_SECRET is required in production for SEO panel auth");
  }
  return secret || "sarj-admin-jwt-secret-key-2024-secure";
}

export const SEO_PANEL_COOKIE_NAME = "sarj_seo_panel_token";
/** 7 days — shorter than previous 10y cookie */
export const SEO_SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export interface SeoPanelTokenPayload {
  role: "seo";
  iat?: number;
  exp?: number;
}

export function getSeoPanelSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: SEO_SESSION_COOKIE_MAX_AGE,
    path: "/",
  };
}

export function generateSeoPanelToken(): string {
  return jwt.sign({ role: "seo" }, getJwtSecret(), { expiresIn: "7d" });
}

export function verifySeoPanelToken(token: string): SeoPanelTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as SeoPanelTokenPayload;
    if (decoded.role !== "seo") return null;
    return decoded;
  } catch {
    return null;
  }
}

/** Same email as admin panel — ADMIN_EMAIL from env */
export function getSeoPanelAllowedEmail(): string {
  return (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
}

/**
 * SEO panel password: prefer SEO_PANEL_PASSWORD_HASH (bcrypt),
 * fallback to plaintext SEO_PANEL_PASSWORD for local setup.
 */
export async function authenticateSeoPanelPassword(
  password: string
): Promise<{ success: boolean; error?: string }> {
  const hash = process.env.SEO_PANEL_PASSWORD_HASH?.trim();
  const plain = process.env.SEO_PANEL_PASSWORD?.trim();

  if (!hash && !plain) {
    return { success: false, error: "SEO panel password is not configured on the server." };
  }

  let isValid = false;
  if (plain) {
    isValid = password === plain;
  } else if (hash) {
    isValid = await bcrypt.compare(password, hash);
  }

  if (!isValid) {
    return { success: false, error: "Invalid credentials" };
  }
  return { success: true };
}

export async function getSeoPanelTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SEO_PANEL_COOKIE_NAME)?.value ?? null;
}

export async function verifySeoPanelAuth(
  request?: NextRequest
): Promise<{ authenticated: boolean; error?: string }> {
  let token: string | null = null;

  if (request) {
    token = request.cookies.get(SEO_PANEL_COOKIE_NAME)?.value ?? null;
    if (!token) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }
  } else {
    token = await getSeoPanelTokenFromCookies();
  }

  if (!token) {
    return { authenticated: false, error: "No authentication token" };
  }

  const payload = verifySeoPanelToken(token);
  if (!payload) {
    return { authenticated: false, error: "Invalid or expired token" };
  }

  return { authenticated: true };
}

export { checkRateLimit, recordFailedAttempt, clearAttempts, getClientIP };
